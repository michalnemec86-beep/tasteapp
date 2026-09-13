import type {
  ProfileBeerRecord,
  ProfileNumericSummary,
} from "@/lib/profileStats";

export type ProfileTechnicalStatsPayload = {
  plato: ProfileNumericSummary;
  abv: ProfileNumericSummary;
  ibu: ProfileNumericSummary;
  strongestBeer: ProfileBeerRecord | null;
  bitterestBeer: ProfileBeerRecord | null;
  highestPlatoBeer: ProfileBeerRecord | null;
};

const requestCache =
  new Map<
    string,
    Promise<ProfileTechnicalStatsPayload>
  >();

export function loadProfileTechnicalStats(
  profileId: string
) {
  const existing =
    requestCache.get(profileId);

  if (existing) {
    return existing;
  }

  const request = fetch(
    `/api/profiles/${encodeURIComponent(profileId)}/technical-stats`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Profile technical stats request failed: ${response.status}`
        );
      }

      return (
        await response.json()
      ) as ProfileTechnicalStatsPayload;
    })
    .catch((error) => {
      requestCache.delete(profileId);
      throw error;
    });

  requestCache.set(
    profileId,
    request
  );

  return request;
}
