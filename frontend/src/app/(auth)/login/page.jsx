"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/store/authStore";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [genericError, setGenericError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    setGenericError("");
    try {
      await signIn(data.email, data.password);
      router.push("/dashboard"); 
    } catch (error) {
      setGenericError(error.message || "Invalid email or password");
    }
  };

  return (
    <div className="transform transition-all duration-500 hover:-translate-y-1">
      <Card className="border-white/5 bg-[#131316]/60 shadow-2xl backdrop-blur-xl rounded-2xl relative overflow-hidden">
        {/* Subtle top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <CardHeader className="space-y-1 pb-6 text-center sm:text-left my-2 px-8">
          <CardTitle className="text-2xl text-white font-heading tracking-tight">Welcome Back, Creator</CardTitle>
          <CardDescription className="text-white/40 font-medium">
            Access your established narrative workspaces
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-6 px-8 pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold text-white/70 uppercase tracking-wider">Email Address</Label>
              <Input
                id="email"
                placeholder="author@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
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

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-white/70 uppercase tracking-wider">Password</Label>
                <Link
                  href="/auth/reset-password"
                  className="text-[11px] font-semibold text-primary hover:text-white hover:underline transition-colors p-1"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                disabled={isSubmitting}
                className="h-11 bg-[#0e0e11] border-white/5 text-white/90 placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
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
              className="w-full h-11 mt-2 text-sm font-bold text-black bg-gradient-to-r from-primary to-[#69daff] rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(186,158,255,0.15)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Enter Studio"
              )}
            </Button>
          </form>

          <div className="relative mt-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-[#131316] px-3 text-white/30 rounded-full">
                New to Nolan?
              </span>
            </div>
          </div>

          <Link href="/signup">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-white/10 bg-transparent hover:bg-white/5 hover:text-white text-white/60 rounded-xl font-semibold transition-all"
            >
              Initialize Account
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
