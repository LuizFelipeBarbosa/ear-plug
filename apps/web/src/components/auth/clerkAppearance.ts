export const WEB_AUTH_CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#f8fafc",
    colorTextOnPrimaryBackground: "#09090b",
    colorBackground: "#171214",
    colorText: "#f4f4f5",
    colorTextSecondary: "#d4d4d8",
    colorInputText: "#f4f4f5",
    colorInputBackground: "rgba(255,255,255,0.08)",
    colorNeutral: "rgba(255,255,255,0.16)",
  },
  elements: {
    rootBox: "ep-auth-clerk w-full",
    cardBox: "w-full",
    card: "w-full rounded-[1.5rem] bg-transparent shadow-none",
    main: "w-full gap-2.5",
    headerTitle:
      "text-[1.85rem] font-semibold tracking-[-0.03em] text-zinc-50",
    headerSubtitle: "mt-0.5 text-sm leading-5 text-zinc-300",
    form: "mt-3 w-full space-y-2.5",
    formContainer: "w-full space-y-2.5",
    formFieldRow: "w-full gap-2",
    formFieldLabel:
      "mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300",
    formFieldInput:
      "h-12 w-full min-w-0 flex-1 basis-0 rounded-[18px] border border-white/15 bg-white/[0.08] px-4 text-zinc-50 placeholder:text-zinc-400 focus:border-white/35 focus:bg-white/[0.12] focus:ring-0",
    formFieldInputGroup:
      "flex w-full min-w-0 items-stretch overflow-hidden rounded-[18px]",
    formInputGroup: "flex w-full min-w-0 items-stretch gap-0",
    phoneInputBox:
      "flex h-12 w-full min-w-0 items-stretch overflow-hidden rounded-[18px] border border-white/15 bg-white/[0.08] transition-colors focus-within:border-white/35 focus-within:bg-white/[0.12]",
    phoneInputCountrySelectButton:
      "flex h-full shrink-0 items-center justify-start gap-2 border-0 border-r border-white/10 bg-transparent px-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.04]",
    phoneInputCountrySelectIcon: "text-zinc-400",
    phoneInputCountryCode: "text-sm font-medium text-zinc-200",
    formButtonPrimary:
      "mt-0 h-12 rounded-[18px] bg-white text-zinc-950 font-semibold shadow-[0_18px_40px_rgba(255,255,255,0.16)] hover:bg-zinc-100",
    socialButtons: "mt-0 w-full space-y-2",
    socialButtonsBlockButton:
      "h-12 rounded-[18px] border border-white/15 bg-white/[0.06] text-zinc-100 shadow-none hover:bg-white/[0.12]",
    dividerRow: "my-2",
    footer: "hidden",
    footerAction: "hidden",
    footerActionText: "hidden",
    footerActionLink: "font-medium text-white hover:text-zinc-200",
    dividerLine: "bg-white/12",
    dividerText:
      "bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500",
    identityPreview: "rounded-[18px] border border-white/12 bg-white/[0.08]",
    identityPreviewText: "text-zinc-100",
    identityPreviewEditButton: "text-zinc-200 hover:text-white",
    formFieldSuccessText: "text-emerald-300",
    formFieldErrorText: "text-rose-300",
    alert:
      "rounded-[18px] border border-rose-300/20 bg-rose-400/10 text-rose-100",
    alertText: "text-rose-100",
  },
} as const;
