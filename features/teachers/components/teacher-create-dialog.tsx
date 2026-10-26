'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, MapPin, User, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { createTeacherAction } from '@/features/teachers/actions';
import {
  emptyTeacherCreateInput,
  type Teacher,
  type TeacherCreateInput,
} from '@/features/teachers/types';
import {
  findRegionName,
  getDistricts,
  getProvinces,
  getRegencies,
  getVillages,
  type IndonesiaRegion,
} from '@/features/teachers/services/indonesia-regions';
import { cn } from '@/lib/utils';

interface TeacherCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (teacher: Teacher) => void;
}

type AddressKind = 'ktp' | 'domicile';

interface AddressSelectorProps {
  title: string;
  kind: AddressKind;
  disabled?: boolean;
  formData: TeacherCreateInput;
  onChange: <K extends keyof TeacherCreateInput>(field: K, value: TeacherCreateInput[K]) => void;
}

function AddressSelector({ title, kind, disabled = false, formData, onChange }: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<IndonesiaRegion[]>([]);
  const [regencies, setRegencies] = useState<IndonesiaRegion[]>([]);
  const [districts, setDistricts] = useState<IndonesiaRegion[]>([]);
  const [villages, setVillages] = useState<IndonesiaRegion[]>([]);
  const [loadError, setLoadError] = useState('');

  const provinceId = String(formData[`${kind}ProvinceId` as keyof TeacherCreateInput] ?? '');
  const regencyId = String(formData[`${kind}RegencyId` as keyof TeacherCreateInput] ?? '');
  const districtId = String(formData[`${kind}DistrictId` as keyof TeacherCreateInput] ?? '');
  const villageId = String(formData[`${kind}VillageId` as keyof TeacherCreateInput] ?? '');
  const street = String(formData[`${kind}Street` as keyof TeacherCreateInput] ?? '');

  useEffect(() => {
    let isMounted = true;
    getProvinces()
      .then((items) => {
        if (isMounted) {
          setProvinces(items);
          setLoadError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Data provinsi gagal dimuat');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    if (!provinceId) return;

    getRegencies(provinceId)
      .then((items) => {
        if (isMounted) {
          setRegencies(items);
          setLoadError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Data kabupaten/kota gagal dimuat');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [provinceId]);

  useEffect(() => {
    let isMounted = true;
    setDistricts([]);
    setVillages([]);

    if (!regencyId) return;

    getDistricts(regencyId)
      .then((items) => {
        if (isMounted) {
          setDistricts(items);
          setLoadError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Data kecamatan gagal dimuat');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [regencyId]);

  useEffect(() => {
    let isMounted = true;
    setVillages([]);

    if (!districtId) return;

    getVillages(districtId)
      .then((items) => {
        if (isMounted) {
          setVillages(items);
          setLoadError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Data kelurahan/desa gagal dimuat');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [districtId]);

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-primary" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>

      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor={`${kind}-street`}>Jalan / RT / RW / Nomor Rumah</Label>
        <Input
          id={`${kind}-street`}
          value={street}
          onChange={(e) => onChange(`${kind}Street` as keyof TeacherCreateInput, e.target.value as never)}
          placeholder="misal: Jl. Mawar No. 12, RT 02/RW 04"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Provinsi</Label>
          <Select
            value={provinceId}
            onValueChange={(val) => {
              onChange(`${kind}ProvinceId` as keyof TeacherCreateInput, val as never);
              onChange(`${kind}ProvinceName` as keyof TeacherCreateInput, findRegionName(provinces, val) as never);
              onChange(`${kind}RegencyId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}RegencyName` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}DistrictId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}DistrictName` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}VillageId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}VillageName` as keyof TeacherCreateInput, '' as never);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Provinsi" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Kabupaten / Kota</Label>
          <Select
            value={regencyId}
            onValueChange={(val) => {
              onChange(`${kind}RegencyId` as keyof TeacherCreateInput, val as never);
              onChange(`${kind}RegencyName` as keyof TeacherCreateInput, findRegionName(regencies, val) as never);
              onChange(`${kind}DistrictId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}DistrictName` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}VillageId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}VillageName` as keyof TeacherCreateInput, '' as never);
            }}
            disabled={disabled || !provinceId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Kabupaten / Kota" />
            </SelectTrigger>
            <SelectContent>
              {regencies.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Kecamatan</Label>
          <Select
            value={districtId}
            onValueChange={(val) => {
              onChange(`${kind}DistrictId` as keyof TeacherCreateInput, val as never);
              onChange(`${kind}DistrictName` as keyof TeacherCreateInput, findRegionName(districts, val) as never);
              onChange(`${kind}VillageId` as keyof TeacherCreateInput, '' as never);
              onChange(`${kind}VillageName` as keyof TeacherCreateInput, '' as never);
            }}
            disabled={disabled || !regencyId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Kecamatan" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Kelurahan / Desa</Label>
          <Select
            value={villageId}
            onValueChange={(val) => {
              onChange(`${kind}VillageId` as keyof TeacherCreateInput, val as never);
              onChange(`${kind}VillageName` as keyof TeacherCreateInput, findRegionName(villages, val) as never);
            }}
            disabled={disabled || !districtId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Kelurahan / Desa" />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: 'Akun & Kontak',
    description: 'Username, password, email, nama lengkap, dan nomor kontak guru.',
  },
  {
    title: 'Data Pribadi & Profil',
    description: 'Tempat & tanggal lahir, pendidikan terakhir, dan info mengajar.',
  },
  {
    title: 'Alamat Lengkap',
    description: 'Alamat KTP dan alamat domisili guru.',
  },
];

export function TeacherCreateDialog({ open, onOpenChange, onSuccess }: TeacherCreateDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<TeacherCreateInput>(emptyTeacherCreateInput);
  const [stepError, setStepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setFormData(emptyTeacherCreateInput);
    setCurrentStep(0);
    setStepError('');
    setShowPassword(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isSubmitting) {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    }
  };

  const handleChange = <K extends keyof TeacherCreateInput>(field: K, value: TeacherCreateInput[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto synchronize username if typed into email or vice versa if empty
      if (field === 'username' && !prev.email && typeof value === 'string' && value.includes('@')) {
        next.email = value;
      }
      return next;
    });
  };

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!formData.username.trim() || formData.username.trim().length < 3) {
        return 'Username minimal 3 karakter';
      }
      if (!formData.password || formData.password.length < 6) {
        return 'Password minimal 6 karakter';
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        return 'Format email guru belum valid';
      }
      if (!formData.fullName.trim()) {
        return 'Nama lengkap guru wajib diisi';
      }
      if (!formData.nickname.trim()) {
        return 'Nama panggilan wajib diisi';
      }
      const digits = formData.phoneNationalNumber.replace(/[^\d]/g, '');
      if (digits.length < 5) {
        return 'Nomor telepon minimal 5 digit';
      }
    } else if (step === 1) {
      if (!formData.birthDate) {
        return 'Tanggal lahir wajib diisi';
      }
      if (!formData.birthPlace.trim()) {
        return 'Tempat lahir wajib diisi';
      }
      if (!formData.lastEducation.trim()) {
        return 'Pendidikan terakhir wajib diisi (misal: S1 Pendidikan)';
      }
    } else if (step === 2) {
      if (!formData.ktpStreet.trim()) {
        return 'Jalan alamat KTP wajib diisi';
      }
      if (!formData.ktpProvinceId || !formData.ktpRegencyId || !formData.ktpDistrictId || !formData.ktpVillageId) {
        return 'Silakan lengkapi pilihan wilayah alamat KTP hingga kelurahan/desa';
      }
      if (!formData.domicileSameAsKtp) {
        if (!formData.domicileStreet?.trim()) {
          return 'Jalan alamat domisili wajib diisi jika berbeda dari KTP';
        }
        if (
          !formData.domicileProvinceId ||
          !formData.domicileRegencyId ||
          !formData.domicileDistrictId ||
          !formData.domicileVillageId
        ) {
          return 'Silakan lengkapi pilihan wilayah alamat domisili hingga kelurahan/desa';
        }
      }
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepError('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let s = 0; s <= 2; s++) {
      const error = validateStep(s);
      if (error) {
        setCurrentStep(s);
        setStepError(error);
        return;
      }
    }

    setStepError('');
    setIsSubmitting(true);

    try {
      const countryCode = formData.phoneCountryCode || '+62';
      const cleanNational = formData.phoneNationalNumber.replace(/[^\d]/g, '').replace(/^0+/, '');
      const phoneNumber = `${countryCode}${cleanNational}`;

      const payload: TeacherCreateInput = {
        ...formData,
        phoneCountryCode: countryCode,
        phoneNationalNumber: cleanNational,
        phoneNumber,
        experienceYears: Number(formData.experienceYears) || 0,
      };

      const result = await createTeacherAction(payload);
      if (!result.success || !result.data) {
        setStepError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(result.message || 'Guru berhasil ditambahkan dengan profil lengkap');
      if (onSuccess) {
        onSuccess(result.data);
      }
      handleOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan guru';
      setStepError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" />
            Tambah Guru Baru
          </DialogTitle>
          <DialogDescription>
            Lengkapi data akun, profil pribadi, dan alamat guru untuk mendaftarkan pengajar baru.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="space-y-2 py-2">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((step, idx) => (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  if (idx < currentStep) {
                    setStepError('');
                    setCurrentStep(idx);
                  }
                }}
                disabled={isSubmitting}
                className={cn(
                  'group flex flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors',
                  idx === currentStep
                    ? 'border-primary bg-primary/5 text-primary'
                    : idx < currentStep
                    ? 'border-muted-foreground/30 bg-muted/40 text-foreground cursor-pointer hover:bg-muted/60'
                    : 'border-border/60 bg-transparent text-muted-foreground opacity-60'
                )}
              >
                <span className="text-[10px] font-bold tracking-wider uppercase">
                  Langkah {idx + 1}
                </span>
                <span className="text-xs font-semibold line-clamp-1">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            {STEPS[currentStep].description}
          </div>
        </div>

        {stepError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {stepError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: Akun & Kontak */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-username">Username Guru *</Label>
                  <Input
                    id="create-username"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="misal: budi_guru"
                    disabled={isSubmitting}
                    autoComplete="off"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Digunakan untuk login di client.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-password">Password Akun *</Label>
                  <div className="relative">
                    <Input
                      id="create-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Minimal 6 karakter"
                      disabled={isSubmitting}
                      className="pr-9"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Password awal untuk guru masuk pertama kali.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-email">Email Guru *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="budi@example.com"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-phone">Nomor Telepon / WhatsApp *</Label>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <Input
                      value={formData.phoneCountryCode}
                      onChange={(e) => handleChange('phoneCountryCode', e.target.value)}
                      placeholder="+62"
                      disabled={isSubmitting}
                    />
                    <Input
                      id="create-phone"
                      type="tel"
                      value={formData.phoneNationalNumber}
                      onChange={(e) => handleChange('phoneNationalNumber', e.target.value)}
                      placeholder="81234567890"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-fullname">Nama Lengkap *</Label>
                  <Input
                    id="create-fullname"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="misal: Budi Santoso, S.Pd"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-nickname">Nama Panggilan *</Label>
                  <Input
                    id="create-nickname"
                    value={formData.nickname}
                    onChange={(e) => handleChange('nickname', e.target.value)}
                    placeholder="misal: Pak Budi"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Data Pribadi & Profil Guru */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-birthplace">Tempat Lahir *</Label>
                  <Input
                    id="create-birthplace"
                    value={formData.birthPlace}
                    onChange={(e) => handleChange('birthPlace', e.target.value)}
                    placeholder="misal: Jakarta"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-birthdate">Tanggal Lahir *</Label>
                  <Input
                    id="create-birthdate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange('birthDate', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-lastedu">Pendidikan Terakhir *</Label>
                  <Input
                    id="create-lastedu"
                    value={formData.lastEducation}
                    onChange={(e) => handleChange('lastEducation', e.target.value)}
                    placeholder="misal: S1 Pendidikan Bahasa Inggris"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-experience">Pengalaman Mengajar (Tahun)</Label>
                  <Input
                    id="create-experience"
                    type="number"
                    min="0"
                    value={formData.experienceYears ?? 0}
                    onChange={(e) => handleChange('experienceYears', Number(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-headline">Headline Guru (Opsional)</Label>
                <Input
                  id="create-headline"
                  value={formData.headline ?? ''}
                  onChange={(e) => handleChange('headline', e.target.value)}
                  placeholder="misal: Tutor TOEFL & Percakapan Bahasa Inggris Profesional"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-bio">Bio Singkat Guru (Opsional)</Label>
                <Textarea
                  id="create-bio"
                  rows={3}
                  value={formData.bio ?? ''}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Ceritakan latar belakang, fokus keahlian, atau metode mengajar..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Alamat Lengkap */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <AddressSelector
                title="Alamat KTP"
                kind="ktp"
                formData={formData}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              <div className="flex items-start gap-3 rounded-lg border bg-background p-3.5 shadow-xs">
                <Checkbox
                  id="domicileSameAsKtp"
                  checked={formData.domicileSameAsKtp}
                  onCheckedChange={(checked) => handleChange('domicileSameAsKtp', checked === true)}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="domicileSameAsKtp" className="cursor-pointer text-sm font-semibold">
                    Alamat Domisili Sama dengan Alamat KTP
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Centang jika guru saat ini berdomisili di alamat yang sama dengan KTP.
                  </p>
                </div>
              </div>

              {!formData.domicileSameAsKtp && (
                <AddressSelector
                  title="Alamat Domisili"
                  kind="domicile"
                  formData={formData}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Sebelumnya
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                Lanjut
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Menyimpan & Membuat Akun...
                  </>
                ) : (
                  'Buat Akun & Simpan Profil Guru'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
