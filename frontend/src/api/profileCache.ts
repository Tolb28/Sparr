let cachedProfileResponse: any | null = null;
let inFlightProfileRequest: Promise<any> | null = null;
let cacheGeneration = 0;

export function getCachedProfileResponse() {
  return cachedProfileResponse;
}

export function setCachedProfileResponse(response: any) {
  cachedProfileResponse = response;
}

export function getInFlightProfileRequest() {
  return inFlightProfileRequest;
}

export function setInFlightProfileRequest(request: Promise<any> | null) {
  inFlightProfileRequest = request;
}

export function clearCachedProfileResponse() {
  cachedProfileResponse = null;
  inFlightProfileRequest = null;
  cacheGeneration += 1;
}

export function getProfileCacheGeneration() {
  return cacheGeneration;
}
