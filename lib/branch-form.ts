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

function parseCommaSeparated(value: string | null): string[] | null {
  if (!value) return null;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
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

  const code = readOptionalText(formData, "code");

  const payload: {
    name: string;
    phoneNumber?: string | null;
    phone?: string | null;
    gstin?: string | null;
    cin?: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    state: string | null;
    postalCode: string | null;
    latitude: number;
    longitude: number;
    serviceRadiusKm: number;
    code?: string;
    assignedBranchAdminAuthUserId?: string | null;
    imageUrl?: string | null;
    rating?: number | null;
    reviews?: number | null;
    tags?: string[] | null;
    features?: string[] | null;
    pickupTime?: string | null;
    readyWithin?: string | null;
    openHours?: string | null;
    status?: string | null;
    directionsUrl?: string | null;
    todaySlots?: any;
  } = {
    name: readText(formData, "name"),
    phoneNumber: readOptionalText(formData, "phoneNumber") ?? readOptionalText(formData, "phone"),
    phone: readOptionalText(formData, "phoneNumber") ?? readOptionalText(formData, "phone"),
    gstin: readOptionalText(formData, "gstin"),
    cin: readOptionalText(formData, "cin"),
    city: readOptionalText(formData, "city"),
    addressLine1: readOptionalText(formData, "addressLine1"),
    addressLine2: readOptionalText(formData, "addressLine2"),
    state: readOptionalText(formData, "state"),
    postalCode: readOptionalText(formData, "postalCode"),
    latitude,
    longitude,
    serviceRadiusKm: readServiceRadiusKm(formData),
    imageUrl: readOptionalText(formData, "imageUrl"),
    rating: readOptionalNumber(formData, "rating"),
    reviews: readOptionalNumber(formData, "reviews"),
    pickupTime: readOptionalText(formData, "pickupTime"),
    readyWithin: readOptionalText(formData, "readyWithin"),
    openHours: readOptionalText(formData, "openHours"),
    status: readOptionalText(formData, "status"),
    directionsUrl: readOptionalText(formData, "directionsUrl"),
    tags: parseCommaSeparated(readOptionalText(formData, "tags")),
    features: parseCommaSeparated(readOptionalText(formData, "features")),
  };

  const todaySlotsRaw = readOptionalText(formData, "todaySlots");
  if (todaySlotsRaw) {
    try {
      payload.todaySlots = JSON.parse(todaySlotsRaw);
    } catch {}
  }

  if (code) {
    payload.code = code;
  }

  if (options.includeAssignedBranchAdmin) {
    payload.assignedBranchAdminAuthUserId =
      readOptionalText(formData, "assignedBranchAdminAuthUserId");
  }

  return payload;
}

export const defaultServiceRadiusKm = DEFAULT_SERVICE_RADIUS_KM;
