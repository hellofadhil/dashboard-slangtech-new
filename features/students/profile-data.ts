import { asBoolean, asRecord, asString } from '@/features/shared/firestore-data';
import { emptyUserProfileInput, type UserProfileInput } from '@/features/students/types';

interface NormalizeUserProfileOptions {
  fullNameFallback?: string;
  emailFallback?: string;
}

export function normalizeUserProfileInputData(
  value: unknown,
  options: NormalizeUserProfileOptions = {},
): UserProfileInput {
  const data = asRecord(value);
  const email = asString(data.email, options.emailFallback ?? emptyUserProfileInput.email);
  const phoneCountryCode = asString(data.phoneCountryCode, emptyUserProfileInput.phoneCountryCode)
    || emptyUserProfileInput.phoneCountryCode;
  const phoneNationalNumber = asString(data.phoneNationalNumber, emptyUserProfileInput.phoneNationalNumber);
  const phoneNumber = asString(data.phoneNumber, asString(data.phone))
    || (phoneNationalNumber ? `${phoneCountryCode}${phoneNationalNumber}` : emptyUserProfileInput.phoneNumber);

  return {
    fullName: asString(
      data.fullName,
      asString(data.name, options.fullNameFallback ?? email),
    ),
    nickname: asString(data.nickname, emptyUserProfileInput.nickname),
    phoneCountryCode,
    phoneNationalNumber,
    phoneNumber,
    email,
    birthDate: asString(data.birthDate, emptyUserProfileInput.birthDate),
    birthPlace: asString(data.birthPlace, emptyUserProfileInput.birthPlace),
    ktpStreet: asString(data.ktpStreet, emptyUserProfileInput.ktpStreet),
    ktpProvinceId: asString(data.ktpProvinceId, emptyUserProfileInput.ktpProvinceId),
    ktpProvinceName: asString(data.ktpProvinceName, emptyUserProfileInput.ktpProvinceName),
    ktpRegencyId: asString(data.ktpRegencyId, emptyUserProfileInput.ktpRegencyId),
    ktpRegencyName: asString(data.ktpRegencyName, emptyUserProfileInput.ktpRegencyName),
    ktpDistrictId: asString(data.ktpDistrictId, emptyUserProfileInput.ktpDistrictId),
    ktpDistrictName: asString(data.ktpDistrictName, emptyUserProfileInput.ktpDistrictName),
    ktpVillageId: asString(data.ktpVillageId, emptyUserProfileInput.ktpVillageId),
    ktpVillageName: asString(data.ktpVillageName, emptyUserProfileInput.ktpVillageName),
    ktpAddress: asString(data.ktpAddress, emptyUserProfileInput.ktpAddress),
    domicileSameAsKtp: asBoolean(data.domicileSameAsKtp, emptyUserProfileInput.domicileSameAsKtp),
    domicileStreet: asString(data.domicileStreet, emptyUserProfileInput.domicileStreet),
    domicileProvinceId: asString(data.domicileProvinceId, emptyUserProfileInput.domicileProvinceId),
    domicileProvinceName: asString(data.domicileProvinceName, emptyUserProfileInput.domicileProvinceName),
    domicileRegencyId: asString(data.domicileRegencyId, emptyUserProfileInput.domicileRegencyId),
    domicileRegencyName: asString(data.domicileRegencyName, emptyUserProfileInput.domicileRegencyName),
    domicileDistrictId: asString(data.domicileDistrictId, emptyUserProfileInput.domicileDistrictId),
    domicileDistrictName: asString(data.domicileDistrictName, emptyUserProfileInput.domicileDistrictName),
    domicileVillageId: asString(data.domicileVillageId, emptyUserProfileInput.domicileVillageId),
    domicileVillageName: asString(data.domicileVillageName, emptyUserProfileInput.domicileVillageName),
    domicileAddress: asString(data.domicileAddress, emptyUserProfileInput.domicileAddress),
    lastEducation: asString(data.lastEducation, emptyUserProfileInput.lastEducation),
  };
}
