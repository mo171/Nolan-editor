"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/store/authStore";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuthActions();
  const [genericError, setGenericError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    setGenericError("");
    try {
      await signUp(data.email, data.password);
      router.push("/login?signup=success");
    } catch (error) {
      setGenericError(error.message || "Failed to create account");
    }
  };

  return (
    <div className="transform transition-all duration-500 hover:-translate-y-1">
      <Card className="border-white/5 bg-[#131316]/60 shadow-2xl backdrop-blur-xl rounded-2xl relative overflow-hidden">
        {/* Subtle top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <CardHeader className="space-y-1 pb-6 text-center sm:text-left my-2 px-8">
          <CardTitle className="text-2xl text-white font-heading tracking-tight">Become a Creator</CardTitle>
          <CardDescription className="text-white/40 font-medium">
            Join Nolan AI Studio and architect your next universe.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-6 px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold text-white/70 uppercase tracking-wider">Email Address</Label>
              <Input
                id="email"
                placeholder="author@example.com"
                type="email"
                disabled={isSubmitting}
                className="h-11 bg-[#0e0e11] border-white/5 text-white/90 placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-xs font-bold text-white/70 uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                disabled={isSubmitting}
                className="h-11 bg-[#0e0e11] border-white/5 text-white/90 placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {errors.password ? (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              ) : (
                <p className="text-[10px] text-white/30 font-bold tracking-wide mt-1 uppercase">At least 8 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-xs font-bold text-white/70 uppercase tracking-wider">Confirm Password</Label>
              <Input
                id="confirmPassword"
                placeholder="••••••••"
                type="password"
                disabled={isSubmitting}
                className="h-11 bg-[#0e0e11] border-white/5 text-white/90 placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl"
                {...register("confirmPassword", {
                  required: "Confirm Password is required",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Privacy Checkbox */}
            <div className="flex items-start space-x-3 mt-2">
              <Checkbox
                id="terms"
                className="mt-0.5 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                {...register("terms", {
                  required: "You must agree to the terms",
                })}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-xs text-white/50 font-medium leading-relaxed cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the{" "}
                  <Link href="#" className="flex-none text-primary hover:text-white hover:underline transition-colors focus:ring-2 focus:ring-primary/30 outline-none rounded-sm">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="flex-none text-primary hover:text-white hover:underline transition-colors focus:ring-2 focus:ring-primary/30 outline-none rounded-sm">
                    Privacy Configuration
                  </Link>
                </label>
                {errors.terms && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.terms.message}
                  </p>
                )}
              </div>
            </div>

            {genericError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 mt-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="leading-snug">{genericError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 text-sm font-bold text-black bg-gradient-to-r from-primary to-[#69daff] rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(186,158,255,0.15)] group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  Initialize Profile
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="relative mt-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-[#131316] px-3 text-white/30 rounded-full">
                Already registered?
              </span>
            </div>
          </div>

          <Link href="/login">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-white/10 bg-transparent hover:bg-white/5 hover:text-white text-white/60 rounded-xl font-semibold transition-all"
            >
              Access Workspace
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
