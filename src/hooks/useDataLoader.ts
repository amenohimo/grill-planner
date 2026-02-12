import { useCallback, useEffect, useState } from "react";
import { DATA_PATHS } from "@/constants";
import type { HazardConfigData, SpecialMaster, WeaponMaster } from "@/types";

interface RawWeaponEntry {
  Id: number;
  Label: string;
  RowId: string;
}

interface RawSpecialEntry {
  Id: number;
  Label: string;
  RowId: string;
}

export interface MasterData {
  readonly weapons: readonly WeaponMaster[];
  readonly specials: readonly SpecialMaster[];
  readonly hazardConfigData: HazardConfigData;
}

interface DataLoaderResult {
  data: MasterData | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

function mapWeapon(raw: RawWeaponEntry): WeaponMaster {
  return { id: raw.Id, label: raw.Label, rowId: raw.RowId };
}

function mapSpecial(raw: RawSpecialEntry): SpecialMaster {
  return { id: raw.Id, label: raw.Label, rowId: raw.RowId };
}

export function useDataLoader(): DataLoaderResult {
  const [data, setData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const basePath = import.meta.env.BASE_URL;

    Promise.all([
      fetch(`${basePath}${DATA_PATHS.weapon}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load weapon.json: ${r.status}`);
        return r.json() as Promise<RawWeaponEntry[]>;
      }),
      fetch(`${basePath}${DATA_PATHS.special}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load special.json: ${r.status}`);
        return r.json() as Promise<RawSpecialEntry[]>;
      }),
      fetch(`${basePath}${DATA_PATHS.hazardConfig}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load CoopLevelsConfig.json: ${r.status}`);
        return r.json() as Promise<HazardConfigData>;
      }),
    ])
      .then(([rawWeapons, rawSpecials, hazardConfigData]) => {
        if (cancelled) return;
        setData({
          weapons: rawWeapons.map(mapWeapon),
          specials: rawSpecials.map(mapSpecial),
          hazardConfigData,
        });
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error loading data");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error, retry };
}
