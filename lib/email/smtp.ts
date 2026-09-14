import 'server-only';

import net from 'node:net';
import tls from 'node:tls';

type SmtpSocket = net.Socket | tls.TLSSocket;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
};

export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

type SmtpResponse = {
  code: number;
  message: string;
};

const SMTP_TIMEOUT_MS = 20_000;
const ADMIN_EMAIL = 'slangtech.info@gmail.com';

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string): string {
  const sanitized = sanitizeHeader(value);

  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }

  return `=?UTF-8?B?${Buffer.from(sanitized, 'utf8').toString('base64')}?=`;
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
}

function escapeDataLines(value: string): string {
  return normalizeNewlines(value).replace(/^\./gm, '..');
}

function extractEmailAddress(value: string): string {
  const bracketMatch = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);

  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }

  return value.trim();
}

function normalizeRecipients(value: string | string[]): string[] {
  const recipients = Array.isArray(value) ? value : [value];

  return Array.from(
    new Set(
      recipients
        .map((recipient) => sanitizeHeader(recipient))
        .filter(Boolean),
    ),
  );
}

function withAdminRecipient(value: string | string[]): string[] {
  return normalizeRecipients([...normalizeRecipients(value), ADMIN_EMAIL]);
}

function assertExpectedResponse(
  response: SmtpResponse,
  expectedCodes: number[],
  command: string,
): void {
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP gagal pada ${command}: ${response.message.trim()}`);
  }
}

function getRequiredSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '465');
  const secure = (process.env.SMTP_SECURE ?? 'true') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || (user ? `LKP SlangTech <${user}>` : '');

  if (!host || !Number.isFinite(port) || port <= 0 || !user || !pass || !from) {
    throw new Error('Konfigurasi SMTP belum lengkap.');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    from,
  };
}

function readResponse(socket: SmtpSocket): Promise<SmtpResponse> {
  return new Promise((resolve, reject) => {
    let response = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error('Koneksi SMTP timeout.'));
    };

    const onData = (chunk: Buffer | string) => {
      response += chunk.toString();

      const lines = response.split(/\r?\n/).filter(Boolean);
      const lastLine = lines.at(-1);

      if (!lastLine || !/^\d{3} /.test(lastLine)) {
        return;
      }

      cleanup();

      resolve({
        code: Number(lastLine.slice(0, 3)),
        message: response,
      });
    };

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

async function sendCommand(
  socket: SmtpSocket,
  command: string,
  expectedCodes: number[],
): Promise<SmtpResponse> {
  socket.write(`${command}\r\n`);

  const response = await readResponse(socket);

  assertExpectedResponse(
    response,
    expectedCodes,
    command.split(' ')[0] || command,
  );

  return response;
}

function connectSecure(config: SmtpConfig): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
    });

    const onSecureConnect = () => {
      socket.off('error', reject);
      resolve(socket);
    };

    socket.setTimeout(SMTP_TIMEOUT_MS);
    socket.once('secureConnect', onSecureConnect);
    socket.once('error', reject);
  });
}

function connectPlain(config: SmtpConfig): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({
      host: config.host,
      port: config.port,
    });

    const onConnect = () => {
      socket.off('error', reject);
      resolve(socket);
    };

    socket.setTimeout(SMTP_TIMEOUT_MS);
    socket.once('connect', onConnect);
    socket.once('error', reject);
  });
}

function startTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host,
    });

    const onSecureConnect = () => {
      secureSocket.off('error', reject);
      resolve(secureSocket);
    };

    secureSocket.setTimeout(SMTP_TIMEOUT_MS);
    secureSocket.once('secureConnect', onSecureConnect);
    secureSocket.once('error', reject);
  });
}

function createMimeMessage(
  config: SmtpConfig,
  message: MailMessage,
  recipients: string[],
): string {
  const boundary = `slangtech-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const from = sanitizeHeader(config.from);
  const to = recipients.join(', ');

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    normalizeNewlines(message.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    normalizeNewlines(message.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export async function sendSmtpMail(message: MailMessage): Promise<void> {
  const config = getRequiredSmtpConfig();

  const recipients = withAdminRecipient(message.to);

  if (recipients.length === 0) {
    throw new Error('Email tujuan belum tersedia.');
  }

  let socket: SmtpSocket | null = config.secure
    ? await connectSecure(config)
    : await connectPlain(config);

  try {
    const greeting = await readResponse(socket);

    assertExpectedResponse(greeting, [220], 'CONNECT');

    const ehlo = await sendCommand(socket, 'EHLO slangtech-dashboard', [250]);

    if (!config.secure && ehlo.message.toUpperCase().includes('STARTTLS')) {
      await sendCommand(socket, 'STARTTLS', [220]);

      socket = await startTls(socket as net.Socket, config.host);

      await sendCommand(socket, 'EHLO slangtech-dashboard', [250]);
    }

    const authToken = Buffer.from(
      `\u0000${config.auth.user}\u0000${config.auth.pass}`,
      'utf8',
    ).toString('base64');

    await sendCommand(socket, `AUTH PLAIN ${authToken}`, [235]);

    await sendCommand(
      socket,
      `MAIL FROM:<${extractEmailAddress(config.from)}>`,
      [250],
    );

    for (const recipient of recipients) {
      await sendCommand(
        socket,
        `RCPT TO:<${extractEmailAddress(recipient)}>`,
        [250, 251],
      );
    }

    await sendCommand(socket, 'DATA', [354]);

    const mimeMessage = createMimeMessage(config, message, recipients);

    socket.write(`${escapeDataLines(mimeMessage)}\r\n.\r\n`);

    const dataResponse = await readResponse(socket);

    assertExpectedResponse(dataResponse, [250], 'DATA');

    await sendCommand(socket, 'QUIT', [221]);
  } finally {
    socket?.end();
  }
}