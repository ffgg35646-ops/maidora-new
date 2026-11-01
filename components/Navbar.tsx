"use client"

import SiteImage from "./SiteImage"

import PhoneContactButton from "./PhoneContactButton";

import Link from "next/link"
import { useEffect, useState } from "react"
import { startLanguageEngine } from "@/components/LanguageClient"
import { readClientCache, writeClientCache } from "@/lib/client-cache"

type LicenseSettings = {
  enabled: boolean
  viewEnabled: boolean
  downloadEnabled: boolean
  viewFileId: string | null
  downloadFileId: string | null
}

type Contact = {
  whatsapp: string
  phone: string
}

const defaultLicense: LicenseSettings = {
  enabled: true,
  viewEnabled: true,
  downloadEnabled: true,
  viewFileId: null,
  downloadFileId: null,
}

export default function Navbar() {
  const [license, setLicense] =
    useState<LicenseSettings>(defaultLicense)

  const [licenseOpen, setLicenseOpen] = useState(false)

  const [contact, setContact] = useState<Contact>({
    whatsapp: "",
    phone: "",
  })

  const [language, setLanguage] =
    useState<"ar" | "en">("ar")

  useEffect(() => {
    const saved =
      localStorage.getItem("maidora-language") === "en"
        ? "en"
        : "ar"

    setLanguage(saved)

    const stop = startLanguageEngine(saved)

    let mounted = true

    const cachedLicense = readClientCache<LicenseSettings>("license-settings")
    if (cachedLicense) {
      setLicense(cachedLicense)
    }

    const cachedContact = readClientCache<Contact>("contact-settings")
    if (cachedContact) {
      setContact(cachedContact)
    }

    // Always refresh in the background. Cached data is never replaced by a loading state.
    fetch("/api/economic-license/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data) return

        const nextLicense = {
          enabled: true,
          viewEnabled: true,
          downloadEnabled: true,
          viewFileId: data.viewFileId ?? null,
          downloadFileId: data.downloadFileId ?? null,
        }

        writeClientCache("license-settings", nextLicense)
        setLicense(nextLicense)
      })
      .catch(() => {})

    fetch("/api/contact", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data) return

        const nextContact = {
          whatsapp: data.whatsapp ?? "",
          phone: data.phone ?? "",
        }

        writeClientCache("contact-settings", nextContact)
        setContact(nextContact)
      })
      .catch(() => {})

    return () => {
      mounted = false
      stop?.()
    }
  }, [])

  const whatsappNumber =
    contact.whatsapp.replace(/[^0-9]/g, "")

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "#contact"

  const phoneHref = contact.phone
    ? `tel:${contact.phone}`
    : "#contact"

  function changeLanguage(next: "ar" | "en") {
    if (next === language) return

    localStorage.setItem("maidora-language", next)

    window.location.reload()
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <nav className="mx-auto max-w-[1320px] px-4 pt-4 md:px-6">
        <div className="hidden lg:flex h-[70px] items-center justify-between rounded-[20px] border border-white/15 bg-[#8FC4EA] px-4 shadow-[0_12px_35px_rgba(18,87,214,0.16)] md:px-6">

          {/* LOGO */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
          >
            <SiteImage
              page="shared" slot={1} fallbackSrc="/images/saada/logo.svg"
              alt="AL SAADA"
              width={170}
              height={52}
              priority
              className="h-[46px] w-auto object-contain"
            />
          </Link>

          {/* NAV LINKS */}
          <div className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/[0.10] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_15px_rgba(0,0,0,0.05)] backdrop-blur-md lg:flex">

            <Link
              href="/"
              className="rounded-full px-4 py-2.5 text-[12px] font-bold text-white/90 transition hover:bg-white/[0.14] hover:text-white"
            >
              الرئيسية
            </Link>

            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-4 py-2.5 text-[12px] font-bold text-white/90 transition hover:bg-white/[0.14] hover:text-white"
              >
                خدماتنا

                <svg
                  className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="invisible absolute right-0 top-full z-50 w-60 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white p-2 shadow-[0_15px_40px_rgba(0,0,0,0.15)]">

                  <Link
                    href="/full-time-maid-service"
                    className="block rounded-xl px-4 py-3 text-[13px] font-bold text-[#172033] transition hover:bg-[#1257D6]/10 hover:text-[#1257D6]"
                  >
                    الحصول على خادمات
                  </Link>

                  <Link
                    href="/services/maid-visa"
                    className="block rounded-xl px-4 py-3 text-[13px] font-bold text-[#172033] transition hover:bg-[#1257D6]/10 hover:text-[#1257D6]"
                  >
                    تأشيرة عاملة منزلية
                  </Link>

                </div>
              </div>
            </div>

            <Link
              href="/nationalities"
              className="rounded-full px-4 py-2.5 text-[12px] font-bold text-white/90 transition hover:bg-white/[0.14] hover:text-white"
            >
              الجنسيات
            </Link>

            <Link
              href="/about"
              className="rounded-full px-4 py-2.5 text-[12px] font-bold text-white/90 transition hover:bg-white/[0.14] hover:text-white"
            >
              من نحن
            </Link>

          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">

            {/* WHATSAPP */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              title="WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#25D366] text-white shadow-[0_6px_18px_rgba(0,0,0,0.10)] transition hover:-translate-y-0.5"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.96L.06 24l6.28-1.64a11.88 11.88 0 0 0 5.71 1.46h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.23-6.15-3.43-8.44Zm-8.46 18.34h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.73.97 1-3.64-.23-.37a9.85 9.85 0 0 1-1.51-5.3c0-5.44 4.43-9.87 9.88-9.87 2.64 0 5.12 1.03 6.98 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.89 9.9Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.73-1.64-2.03-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.21 5.09 4.5.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
              </svg>
            </a>

            {/* PHONE */}
            <PhoneContactButton
              phone={contact.phone}
              ariaLabel="Call"
              title="Call"
              className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F6B56F] text-white shadow-[0_6px_18px_rgba(0,0,0,0.10)] transition hover:-translate-y-0.5"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.28a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>
              </svg>
            </PhoneContactButton>

            {/* LANGUAGE */}
            <button
              type="button"
              onClick={() =>
                changeLanguage(
                  language === "ar" ? "en" : "ar"
                )
              }
              aria-label="Switch language"
              title={
                language === "ar"
                  ? "English"
                  : "العربية"
              }
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <span className="text-[18px] leading-none">
                🌐
              </span>
            </button>

            {/* LICENSE */}
            <div className="relative hidden shrink-0 md:block">

              <button
                type="button"
                onClick={() =>
                  setLicenseOpen((open) => !open)
                }
                className="flex items-center gap-2 rounded-[12px] bg-[#F6B56F] px-5 py-2.5 text-[12px] font-black text-white tracking-[-0.2px] shadow-[0_6px_18px_rgba(0,0,0,0.10)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F2A95D] md:px-6"
              >
                ترخيص دائرة التنمية الاقتصادية

                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    licenseOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {licenseOpen && (
                <div className="absolute left-0 top-full z-50 w-52 pt-3">
                  <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white p-2 shadow-[0_15px_40px_rgba(0,0,0,0.15)]">

                    <a
                      href="/economic-license/view"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl px-4 py-3 text-[13px] font-bold text-[#172033] transition hover:bg-[#1257D6]/10 hover:text-[#1257D6]"
                    >
                      عرض
                    </a>

                    <a
                      href="/api/economic-license/file?type=download"
                      className="block rounded-xl px-4 py-3 text-[13px] font-bold text-[#172033] transition hover:bg-[#1257D6]/10 hover:text-[#1257D6]"
                    >
                      تحميل الآن
                    </a>

                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* MOBILE NAVBAR */}
        <div className="flex h-[58px] w-full items-center justify-between rounded-[17px] border border-white/20 bg-[#8FC4EA] px-3 shadow-[0_8px_24px_rgba(18,87,214,.14)] lg:hidden">

          {/* LOGO - RIGHT */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
          >
            <SiteImage
              page="shared" slot={1} fallbackSrc="/images/saada/logo.svg"
              alt="AL SAADA"
              width={125}
              height={40}
              priority
              className="h-[36px] w-auto object-contain"
            />
          </Link>

          {/* CENTER ACTIONS */}
          <div className="flex items-center gap-1.5">

            {/* LANGUAGE */}
            <button
              type="button"
              onClick={() =>
                changeLanguage(
                  language === "ar" ? "en" : "ar"
                )
              }
              aria-label="Switch language"
              title={
                language === "ar"
                  ? "English"
                  : "العربية"
              }
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/20 bg-white/10 text-white backdrop-blur-md"
            >
              <span className="text-[15px] leading-none">
                🌐
              </span>
            </button>

            {/* PHONE */}
            <PhoneContactButton
              phone={contact.phone}
              ariaLabel="Call"
              title="اتصال"
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F6B56F] text-white shadow-sm"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[15px] w-[15px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.28a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>
              </svg>
            </PhoneContactButton>

            {/* WHATSAPP */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              title="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#25D366] text-white shadow-sm"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[15px] w-[15px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.96L.06 24l6.28-1.64a11.88 11.88 0 0 0 5.71 1.46h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.23-6.15-3.43-8.44Zm-8.46 18.34h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.73.97 1-3.64-.23-.37a9.85 9.85 0 0 1-1.51-5.3c0-5.44 4.43-9.87 9.88-9.87 2.64 0 5.12 1.03 6.98 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.89 9.9Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.73-1.64-2.03-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.21 5.09 4.5.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
              </svg>
            </a>

          </div>

          {/* MENU - LEFT */}
          <details className="relative shrink-0">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[10px] border border-white/20 bg-white/10 text-white backdrop-blur-md">
              <span className="sr-only">فتح القائمة</span>

              <span className="flex flex-col gap-[4px]">
                <span className="block h-[2px] w-[17px] rounded-full bg-white" />
                <span className="block h-[2px] w-[17px] rounded-full bg-white" />
                <span className="block h-[2px] w-[17px] rounded-full bg-white" />
              </span>
            </summary>

            <div className="absolute left-0 top-full z-[100] mt-2 w-[250px] overflow-hidden rounded-[20px] border border-[#DCE7F5] bg-white p-2 shadow-[0_18px_45px_rgba(20,50,90,.18)]">

              {/* الرئيسية */}
              <Link
                href="/"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5FF] text-[#397EA9]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 10.5L12 3l9 7.5" />
                    <path d="M5.5 9.5V21h13V9.5" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </span>
                الرئيسية
              </Link>

              {/* الحصول على خادمات */}
              <Link
                href="/full-time-maid-service"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F3F8FC] text-[#397EA9]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                الحصول على خادمات
              </Link>

              {/* تأشيرة */}
              <Link
                href="/services/maid-visa"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F3F8FC] text-[#397EA9]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M7 8h4M7 12h6M7 16h4" />
                    <circle cx="17" cy="10" r="2" />
                  </svg>
                </span>
                تأشيرة عاملة منزلية
              </Link>

              <div className="my-1.5 border-t border-slate-100" />

              {/* الترخيص */}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]">
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FFF4E8] text-[#D68B43]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[18px] w-[18px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M6 3h12v18H6z" />
                        <path d="M9 7h6M9 11h6M9 15h4" />
                      </svg>
                    </span>
                    ترخيص دائرة التنمية الاقتصادية
                  </span>

                  <svg
                    className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>

                <div className="mr-3 mt-1 border-r-2 border-[#DCECF8] pr-2">
                  <a
                    href="/economic-license/view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[11px] font-bold text-slate-500 transition hover:bg-[#F1F8FD] hover:text-[#397EA9]"
                  >
                    <span>◉</span>
                    عرض الترخيص
                  </a>

                  <a
                    href="/api/economic-license/file?type=download"
                    className="flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[11px] font-bold text-slate-500 transition hover:bg-[#F1F8FD] hover:text-[#397EA9]"
                  >
                    <span>↓</span>
                    تحميل الترخيص
                  </a>
                </div>
              </details>

              {/* الجنسيات */}
              <Link
                href="/nationalities"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5FF] text-[#397EA9]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c3 2.4 4.5 5.4 4.5 9S15 18.6 12 21c-3-2.4-4.5-5.4-4.5-9S9 5.4 12 3Z" />
                  </svg>
                </span>
                الجنسيات
              </Link>

              {/* من نحن */}
              <Link
                href="/about"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[12px] font-black text-[#172033] transition hover:bg-[#EAF5FF] hover:text-[#397EA9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F3F8FC] text-[#397EA9]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 10v6" />
                    <path d="M12 7h.01" />
                  </svg>
                </span>
                من نحن
              </Link>

            </div>

          </details>

        </div>

      </nav>
    </header>
  )
}
