"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useToast } from "@/components/ui/toast-provider";

const REQUEST_TIMEOUT_MS = 12000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const withTimeout = useCallback(async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const ensureProfile = useCallback(
    async (userId: string) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const metadata = (authUser?.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
      };

      const fallbackName =
        metadata.full_name ??
        metadata.name ??
        authUser?.email?.split("@")[0] ??
        "Player";

      await supabase.from("profiles").upsert(
        {
          id: userId,
          display_name: fallbackName,
        },
        { onConflict: "id" }
      );
    },
    [supabase]
  );

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single(),
          "Loading profile"
        );

        if (error) {
          const errorCode = (error as { code?: string }).code;
          if (errorCode === "PGRST116") {
            await ensureProfile(userId);

            const { data: recoveredProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single();

            if (recoveredProfile) {
              setProfile(recoveredProfile as Profile);
            }
            return;
          }

          console.error("Error fetching profile:", error);
          return;
        }

        setProfile(data as Profile);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    },
    [supabase, withTimeout, ensureProfile]
  );

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await withTimeout(supabase.auth.getUser(), "Loading user session");

        if (!isMounted) return;

        setUser(user);

        if (user) {
          await fetchProfile(user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const failSafeId = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
      console.warn("Auth loading timeout reached; continuing with fallback state.");
    }, REQUEST_TIMEOUT_MS + 2000);

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        if (!isMounted) return;

        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(failSafeId);
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, withTimeout]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || "Could not sign in.");
      return false;
    }

    return true;
  };

  const signUpWithPassword = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });

    if (error) {
      toast.error(error.message || "Could not create account.");
      return { success: false, requiresConfirmation: false };
    }

    const requiresConfirmation = !data.session;
    if (requiresConfirmation) {
      toast.success("Account created. Check your email to confirm your account.");
    }

    return { success: true, requiresConfirmation };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out.");
      return;
    }

    setUser(null);
    setProfile(null);
    router.push("/");
    toast.success("Signed out.");
  };

  const updateProfile = async (updates: {
    display_name?: string;
    avatar_url?: string;
  }) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Could not update profile.");
      return;
    }

    setProfile(data as Profile);
    toast.success("Profile updated.");
  };

  return {
    user,
    profile,
    loading,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    updateProfile,
  };
}
