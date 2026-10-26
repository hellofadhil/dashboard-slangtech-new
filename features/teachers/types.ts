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
  email: string;
  fullName: string;
  nickname: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  phoneNumber?: string;
  birthDate: string;
  birthPlace: string;
  lastEducation: string;
  headline?: string;
  bio?: string;
  experienceYears?: number;
  // KTP
  ktpStreet: string;
  ktpProvinceId: string;
  ktpProvinceName: string;
  ktpRegencyId: string;
  ktpRegencyName: string;
  ktpDistrictId: string;
  ktpDistrictName: string;
  ktpVillageId: string;
  ktpVillageName: string;
  // Domicile
  domicileSameAsKtp: boolean;
  domicileStreet?: string;
  domicileProvinceId?: string;
  domicileProvinceName?: string;
  domicileRegencyId?: string;
  domicileRegencyName?: string;
  domicileDistrictId?: string;
  domicileDistrictName?: string;
  domicileVillageId?: string;
  domicileVillageName?: string;
};

export type Teacher = TeacherInput & {
  id: string;
  uid?: string;
  username?: string;
  birthDate?: string;
  birthPlace?: string;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  ktpStreet?: string;
  ktpProvinceId?: string;
  ktpProvinceName?: string;
  ktpRegencyId?: string;
  ktpRegencyName?: string;
  ktpDistrictId?: string;
  ktpDistrictName?: string;
  ktpVillageId?: string;
  ktpVillageName?: string;
  ktpAddress?: string;
  domicileSameAsKtp?: boolean;
  domicileStreet?: string;
  domicileProvinceId?: string;
  domicileProvinceName?: string;
  domicileRegencyId?: string;
  domicileRegencyName?: string;
  domicileDistrictId?: string;
  domicileDistrictName?: string;
  domicileVillageId?: string;
  domicileVillageName?: string;
  domicileAddress?: string;
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

export const emptyTeacherCreateInput: TeacherCreateInput = {
  username: '',
  password: '',
  email: '',
  fullName: '',
  nickname: '',
  phoneCountryCode: '+62',
  phoneNationalNumber: '',
  phoneNumber: '',
  birthDate: '',
  birthPlace: '',
  lastEducation: '',
  headline: '',
  bio: '',
  experienceYears: 0,
  ktpStreet: '',
  ktpProvinceId: '',
  ktpProvinceName: '',
  ktpRegencyId: '',
  ktpRegencyName: '',
  ktpDistrictId: '',
  ktpDistrictName: '',
  ktpVillageId: '',
  ktpVillageName: '',
  domicileSameAsKtp: false,
  domicileStreet: '',
  domicileProvinceId: '',
  domicileProvinceName: '',
  domicileRegencyId: '',
  domicileRegencyName: '',
  domicileDistrictId: '',
  domicileDistrictName: '',
  domicileVillageId: '',
  domicileVillageName: '',
};
