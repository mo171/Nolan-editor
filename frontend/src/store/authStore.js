import { create } from "zustand";
import { supabase } from "@/lib/supabase";

const DEMO_USER = {
  id: "fc05c627-589b-4f2e-a8bf-b66818cd6c54",
  email: "movindsouza79@gmail.com",
};

const DEMO_SESSION = {
  user: DEMO_USER,
  access_token: null,
};

// ============================================
// AUTH STORE
// ============================================

export const useAuthStore = create((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  error: null,
  authError: {
    signup: undefined,
    login: undefined,
    logout: undefined,
    updateProfile: undefined,
  },

  // Setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAuthError: (field, error) =>
    set((state) => ({
      authError: {
        ...state.authError,
        [field]: error,
      },
    })),

  // ============================================
  // SIGN UP
  // ============================================
  signUp: async (email, password) => {
    set({ loading: true, authError: { signup: undefined } });
    try {
      // Demo mode keeps every browser on the same shared account.
      set({
        user: DEMO_USER,
        session: DEMO_SESSION,
        isAuthenticated: true,
        error: null,
        authError: { signup: undefined },
      });
    } catch (error) {
      const errorMessage = error.message || "Sign up failed";
      set({
        error: errorMessage,
        authError: { signup: errorMessage },
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // SIGN IN
  // ============================================
  signIn: async (email, password) => {
    set({ loading: true, authError: { login: undefined } });
    try {
      // Demo mode keeps every browser on the same shared account.
      set({
        user: DEMO_USER,
        session: DEMO_SESSION,
        isAuthenticated: true,
        error: null,
        authError: { login: undefined },
      });
    } catch (error) {
      const errorMessage = error.message || "Sign in failed";
      set({
        error: errorMessage,
        authError: { login: errorMessage },
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // SIGN OUT
  // ============================================
  signOut: async () => {
    set({ loading: true, authError: { logout: undefined } });
    try {
      // Demo mode keeps the shared account active across browsers.
      set({
        user: DEMO_USER,
        userProfile: null,
        session: DEMO_SESSION,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      const errorMessage = error.message || "Sign out failed";
      set({
        error: errorMessage,
        authError: { logout: errorMessage },
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // RESET PASSWORD
  // ============================================
  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      set({ error: "Password reset link sent to your email" });
    } catch (error) {
      const errorMessage = error.message || "Password reset failed";
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // GET USER PROFILE
  // ============================================
  getUserProfile: async () => {
    // const { user } = get();
    // if (!user) return;
    // set({ loading: true });
    // try {
    //   const { data, error } = await supabase
    //     .from("user_profiles")
    //     .select("*")
    //     .eq("id", user.id)
    //     .single();
    //   if (error && error.code !== "PGRST116") {
    //     throw error;
    //   }
    //   if (data) {
    //     set({ userProfile: data });
    //   }
    // } catch (error) {
    //   console.error("Error fetching user profile:", error.message);
    // } finally {
    //   set({ loading: false });
    // }
  },

  // ============================================
  // CREATE USER PROFILE
  // ============================================
  createUserProfile: async (profile) => {
    // set({ loading: true, authError: { updateProfile: undefined } });
    // try {
    //   const { data, error } = await supabase
    //     .from("user_profiles")
    //     .insert([profile])
    //     .select()
    //     .single();
    //   if (error) throw error
    //   if (data) {
    //     set({ userProfile: data });
    //   }
    // } catch (error) {
    //   const errorMessage = error.message || "Failed to create profile";
    //   set({
    //     error: errorMessage,
    //     authError: { updateProfile: errorMessage },
    //   });
    //   console.error("Profile creation error:", error);
    // } finally {
    //   set({ loading: false });
    // }
  },

  // ============================================
  // UPDATE USER PROFILE
  // ============================================
  updateUserProfile: async (updates) => {
    // const { user } = get();
    // if (!user) throw new Error("No user logged in");
    // set({ loading: true, authError: { updateProfile: undefined } });
    // try {
    //   const { data, error } = await supabase
    //     .from("user_profiles")
    //     .update({
    //       ...updates,
    //       updated_at: new Date().toISOString(),
    //     })
    //     .eq("id", user.id)
    //     .select()
    //     .single();
    //   if (error) throw error;
    //   if (data) {
    //     set({ userProfile: data });
    //   }
    // } catch (error) {
    //   const errorMessage = error.message || "Failed to update profile";
    //   set({
    //     error: errorMessage,
    //     authError: { updateProfile: errorMessage },
    //   });
    //   throw error;
    // } finally {
    //   set({ loading: false });
    // }
  },

  // ============================================
  // INITIALIZE AUTH LISTENER
  // ============================================
  initializeAuth: async () => {
    set({ loading: true });
    try {
      set({
        user: DEMO_USER,
        session: DEMO_SESSION,
        isAuthenticated: true,
        userProfile: null,
      });
      set({ loading: false });
      return () => {};
    } catch (error) {
      console.error("❌ Auth initialization error:", error);
      set({ error: error.message, loading: false });
      return () => {};
    }
  },
}));

// ============================================
// CUSTOM HOOKS
// ============================================

export const useAuth = () => {
  const {
    user,
    userProfile,
    session,
    loading,
    isAuthenticated,
    error,
    authError,
  } = useAuthStore();

  return {
    user,
    userProfile,
    session,
    loading,
    isAuthenticated,
    error,
    authError,
  };
};

export const useAuthActions = () => {
  const {
    signUp,
    signIn,
    signOut,
    resetPassword,
    getUserProfile,
    updateUserProfile,
    createUserProfile,
    initializeAuth,
  } = useAuthStore();

  return {
    signUp,
    signIn,
    signOut,
    resetPassword,
    getUserProfile,
    updateUserProfile,
    createUserProfile,
    initializeAuth,
  };
};
