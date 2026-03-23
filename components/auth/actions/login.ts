'use server'

import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"

function getRoleDashboard(roles: string[]): string {
  const normalized = roles.map((r) => r.toUpperCase())
  if (normalized.includes("DELIVERY_HEAD") || normalized.includes("DELIVERY-HEAD"))
    return "/delivery-head/dashboard"
  if (normalized.includes("ADMIN")) return "/admin/dashboard/jobs"
  if (normalized.includes("ACCOUNT_MANAGER") || normalized.includes("ACCOUNT-MANAGER"))
    return "/account-manager/dashboard"
  if (normalized.includes("POD_LEAD") || normalized.includes("POD-LEAD"))
    return "/pod-lead/dashboard"
  if (normalized.includes("RECRUITER")) return "/pod-lead/dashboard"
  if (normalized.includes("FIN_ADMIN") || normalized.includes("FIN-ADMIN")) return "/finance"
  return "/dashboard"
}

export const handleLoginAction = async (formData: FormData) => {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    // Read the newly-created session to determine the correct dashboard
    const session = await auth()
    const roles: string[] = (session?.user as any)?.roles || []
    const redirectUrl = getRoleDashboard(roles)

    return { success: true, redirectUrl }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." }
        default:
          return { error: "Something went wrong." }
      }
    }
    throw error
  }
}
