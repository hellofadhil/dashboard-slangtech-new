export type UploadFolder = 'classes' | 'events';

export type LocalizedText = {
  id: string;
  en: string;
  zh: string;
};

export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
}
