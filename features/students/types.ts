export type UserProfileInput = {
  fullName: string;
  nickname: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  phoneNumber: string;
  email: string;
  birthDate: string;
  birthPlace: string;
  ktpStreet: string;
  ktpProvinceId: string;
  ktpProvinceName: string;
  ktpRegencyId: string;
  ktpRegencyName: string;
  ktpDistrictId: string;
  ktpDistrictName: string;
  ktpVillageId: string;
  ktpVillageName: string;
  ktpAddress: string;
  domicileSameAsKtp: boolean;
  domicileStreet: string;
  domicileProvinceId: string;
  domicileProvinceName: string;
  domicileRegencyId: string;
  domicileRegencyName: string;
  domicileDistrictId: string;
  domicileDistrictName: string;
  domicileVillageId: string;
  domicileVillageName: string;
  domicileAddress: string;
  lastEducation: string;
};

export const emptyUserProfileInput: UserProfileInput = {
  fullName: '',
  nickname: '',
  phoneCountryCode: '+62',
  phoneNationalNumber: '',
  phoneNumber: '',
  email: '',
  birthDate: '',
  birthPlace: '',
  ktpStreet: '',
  ktpProvinceId: '',
  ktpProvinceName: '',
  ktpRegencyId: '',
  ktpRegencyName: '',
  ktpDistrictId: '',
  ktpDistrictName: '',
  ktpVillageId: '',
  ktpVillageName: '',
  ktpAddress: '',
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
  domicileAddress: '',
  lastEducation: '',
};

export type Student = UserProfileInput & {
  id: string;
  isProfileComplete: boolean;
  createdAt: Date | unknown;
  updatedAt: Date | unknown;
};

export interface StudentQuery {
  search?: string;
}

export type UserProfile = UserProfileInput & {
  uid?: string;
  role?: string;
  displayName?: string;
};
