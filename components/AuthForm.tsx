'use client';

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import toast from 'react-hot-toast';

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import CustomInput from './CustomInput';
import DateOfBirthInput from './DateOfBirthInput';
import { authFormSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getLoggedInUser, signIn, signUp } from '@/lib/actions/user.actions';
import PlaidLink from './PlaidLink';

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formSchema = authFormSchema(type);

  // 1. Define your form with onBlur validation mode for real-time feedback
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      dateOfBirth: "",
      citizenId: ""
    },
  })

  // 2. Define a submit handler.
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === 'sign-up') {
        const userData = {
          firstName: data.firstName!,
          lastName: data.lastName!,
          phone: data.phone!,
          address: data.address!,
          city: data.city!,
          province: data.province!,
          dateOfBirth: data.dateOfBirth!,
          citizenId: data.citizenId!,
          email: data.email,
          password: data.password
        }

        const result = await signUp(userData);

        if (result?.error) {
          toast.error(result.message);
          setError(result.message);
          setIsLoading(false);
          return;
        }

        if (!result) {
          const errorMsg = 'Sign up failed. Please try again.';
          toast.error(errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return;
        }

        setUser(result);
        toast.success('Account created successfully! Now link your bank account.');
      }

      if (type === 'sign-in') {
        const response = await signIn({
          email: data.email,
          password: data.password,
        })

        if (response) {
          toast.success('Welcome back!');
          router.push('/')
        } else {
          const errorMsg = 'Invalid email or password.';
          toast.error(errorMsg);
          setError(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-form">
      <header className='flex flex-col gap-5 md:gap-8'>
        <Link href="/" className="cursor-pointer flex items-center gap-1">
          <Image
            src="/icons/logo.png"
            width={70}
            height={70}
            alt="Fincore logo"
          />
          <Image
            src="/icons/finecore-text-logo.png"
            width={220}
            height={60}
            alt="Finecore"
          />
        </Link>

        <div className="flex flex-col gap-1 md:gap-3">
          <h1 className="text-24 lg:text-36 font-semibold text-white">
            {user
              ? 'Link Account'
              : type === 'sign-in'
                ? 'Sign In'
                : 'Sign Up'
            }
            <p className="text-16 font-normal text-gray-300">
              {user
                ? 'Link your account to get started'
                : 'Please enter your details'
              }
            </p>
          </h1>
        </div>
      </header>
      {user ? (
        <div className="flex flex-col gap-4">
          <PlaidLink user={user} variant="primary" />
        </div>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* ✅ Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              {type === 'sign-up' && (
                <>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='firstName' label="Họ và tên đệm" placeholder='Ví dụ: Nguyễn Văn' />
                    <CustomInput control={form.control} name='lastName' label="Tên" placeholder='Ví dụ: Huy' />
                  </div>
                  <CustomInput control={form.control} name='phone' label="Số điện thoại" placeholder='Ví dụ: 0912345678' />
                  <CustomInput control={form.control} name='address' label="Địa chỉ chi tiết" placeholder='Số nhà, tên đường, phường/xã...' />
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='city' label="Quận / Huyện" placeholder='Ví dụ: Quận 1' />
                    <CustomInput control={form.control} name='province' label="Tỉnh / Thành phố" placeholder='Ví dụ: TP. Hồ Chí Minh' />
                  </div>

                  {/* ✅ Date of Birth with Dropdowns (Year/Month/Day) */}
                  <FormField
                    control={form.control}
                    name='dateOfBirth'
                    render={({ field }) => (
                      <FormItem>
                        <DateOfBirthInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          error={form.formState.errors.dateOfBirth?.message}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <CustomInput control={form.control} name='citizenId' label="Số CCCD / CMND" placeholder='Nhập 9 hoặc 12 chữ số' />
                </>
              )}

              <CustomInput control={form.control} name='email' label="Email" placeholder='Enter your email' />

              <CustomInput control={form.control} name='password' label="Password" placeholder='Enter your password' />

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isLoading} className="form-btn">
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> &nbsp;
                      {type === 'sign-up' ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : type === 'sign-in'
                    ? 'Sign In' : 'Sign Up'}
                </Button>
              </div>
            </form>
          </Form>

          <footer className="flex justify-center gap-1">
            <p className="text-14 font-normal text-gray-600">
              {type === 'sign-in'
                ? "Don't have an account?"
                : "Already have an account?"}
            </p>
            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
              {type === 'sign-in' ? 'Sign up' : 'Sign in'}
            </Link>
          </footer>
        </>
      )}
    </section>
  )
}

export default AuthForm