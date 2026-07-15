// src/components/OnboardingModal.jsx
// Shows once on first login for new org admins — tracked in localStorage
// Drop into your app Layout: {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { X, Building2, Users, User, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'

const STEPS = [
  {
    key: 'welcome',
    icon: Sparkles,
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-600',
    title: (orgName) => `Welcome to ElderLoop${orgName ? `, ${orgName}` : ''}!`,
    body: "You're all set up. Let's take a few minutes to get your community ready — it only takes about 5 minutes.",
    action: null,
    actionLabel: "Let's get started",
  },
  {
    key: 'profile',
    icon: Building2,
    iconBg: 'bg-purple-100 dark:bg-purple-950/50',
    iconColor: 'text-purple-600',
    title: () => 'Set up your community profile',
    body: 'Add your community name, address, phone number, and logo. This information appears throughout ElderLoop and in printed reports.',
    action: '/app/admin?tab=settings',
    actionLabel: 'Open Community Settings',
    skipLabel: 'Skip for now',
  },
  {
    key: 'resident',
    icon: User,
    iconBg: 'bg-green-100 dark:bg-green-950/50',
    iconColor: 'text-green-600',
    title: () => 'Add your first resident',
    body: 'Build your resident directory — add names, room numbers, care levels, and emergency contacts. Everything in ElderLoop connects back to your residents.',
    action: '/app/residents',
    actionLabel: 'Go to Resident Directory',
    skipLabel: 'Skip for now',
  },
  {
    key: 'staff',
    icon: Users,
    iconBg: 'bg-blue-100 dark:bg-blue-950/50',
    iconColor: 'text-blue-600',
    title: () => 'Invite your team',
    body: 'Create accounts for your staff. Each person gets access to the modules their role needs — nothing more, nothing less.',
    action: '/app/admin?tab=users',
    actionLabel: 'Go to User Management',
    skipLabel: 'Skip for now',
  },
  {
    key: 'done',
    icon: CheckCircle2,
    iconBg: 'bg-green-100 dark:bg-green-950/50',
    iconColor: 'text-green-600',
    title: () => "You're ready to go!",
    body: "ElderLoop is set up and ready for your team. You can always come back to these steps from the Admin panel.",
    action: null,
    actionLabel: 'Start using ElderLoop',
  },
]

export default function OnboardingModal({ onClose }) {
  const { organization } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const Icon = current.icon
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const progress = step / (STEPS.length - 1)

  const handleAction = () => {
    if (current.action) {
      onClose()
      navigate(current.action)
    } else if (isLast) {
      onClose()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    if (isLast) {
      onClose()
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-1 bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {isFirst || isLast ? 'Getting Started' : `Step ${step} of ${STEPS.length - 2}`}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 rounded-lg transition-colors"
            title="Close and set up later"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-6">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center mb-5`}>
            <Icon size={26} className={current.iconColor} />
          </div>

          {/* Title */}
          <h2 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
            {current.title(organization?.name)}
          </h2>

          {/* Body */}
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            {current.body}
          </p>

          {/* Step dots (middle steps only) */}
          {!isFirst && !isLast && (
            <div className="flex items-center gap-1.5 mb-6">
              {STEPS.slice(1, -1).map((s, i) => (
                <div
                  key={s.key}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < step - 1
                      ? 'bg-brand-500 w-4'
                      : i === step - 1
                      ? 'bg-brand-400 w-6'
                      : 'bg-slate-200 dark:bg-slate-700 w-4'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAction}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {current.actionLabel}
              {!isLast && <ArrowRight size={15} />}
            </button>

            {current.skipLabel && (
              <button
                onClick={handleSkip}
                className="w-full py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm transition-colors"
              >
                {current.skipLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
