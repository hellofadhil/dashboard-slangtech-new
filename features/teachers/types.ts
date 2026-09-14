export type TeacherLanguage = string;

export type TeacherStatus = 'active' | 'inactive';

export type TeacherAddressInput = {
  street: string;
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
  fullAddress: string;
};

export type TeacherInput = {
  fullName: string;
  nickname: string;
  email: string;
  phoneNumber: string;
  photoUrl?: string;
  headline: string;
  bio: string;
  languages: TeacherLanguage[];
  experienceYears: number;
  lastEducation: string;
  address: TeacherAddressInput;
  status: TeacherStatus;
};

export type TeacherCreateInput = {
  username: string;
  password: string;
};

export type Teacher = TeacherInput & {
  id: string;
  uid?: string;
  username?: string;
  birthDate?: string;
  birthPlace?: string;
  role: 'teacher';
  isProfileComplete: boolean;
  createdAt: Date | unknown;
  updatedAt: Date | unknown;
  createdBy?: string;
};

export interface TeacherQuery {
  search?: string;
}

export const emptyTeacherAddressInput: TeacherAddressInput = {
  street: '',
  provinceId: '',
  provinceName: '',
  regencyId: '',
  regencyName: '',
  districtId: '',
  districtName: '',
  villageId: '',
  villageName: '',
  fullAddress: '',
};

export const emptyTeacherInput: TeacherInput = {
  fullName: '',
  nickname: '',
  email: '',
  phoneNumber: '',
  photoUrl: '',
  headline: '',
  bio: '',
  languages: [],
  experienceYears: 0,
  lastEducation: '',
  address: emptyTeacherAddressInput,
  status: 'active',
};
