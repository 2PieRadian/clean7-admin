const DEFAULT_SERVICE_RADIUS_KM = 8;

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value || null;
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  const nextNumber = Number(value);

  if (!Number.isFinite(nextNumber)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return nextNumber;
}

function readServiceRadiusKm(formData: FormData) {
  const value = readOptionalNumber(formData, "serviceRadiusKm");

  if (value === null) {
    return DEFAULT_SERVICE_RADIUS_KM;
  }

  if (value <= 0) {
    throw new Error("Service radius must be greater than 0 km.");
  }

  return value;
}

export function buildBranchPayload(
  formData: FormData,
  options: {
    includeAssignedBranchAdmin?: boolean;
  } = {},
) {

  const latitude = readOptionalNumber(formData, "latitude");
  const longitude = readOptionalNumber(formData, "longitude");

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  if (latitude === null || longitude === null) {
    throw new Error("Branches need latitude and longitude from the map location.");
  }

  const payload = {
    code: readText(formData, "code"),
    name: readText(formData, "name"),

    city: readOptionalText(formData, "city"),
    addressLine1: readOptionalText(formData, "addressLine1"),
    addressLine2: readOptionalText(formData, "addressLine2"),
    state: readOptionalText(formData, "state"),
    postalCode: readOptionalText(formData, "postalCode"),
    latitude,
    longitude,
    serviceRadiusKm: readServiceRadiusKm(formData),
  };

  if (options.includeAssignedBranchAdmin) {
    return {
      ...payload,
      assignedBranchAdminAuthUserId:
        readOptionalText(formData, "assignedBranchAdminAuthUserId"),
    };
  }

  return payload;
}

export const defaultServiceRadiusKm = DEFAULT_SERVICE_RADIUS_KM;
