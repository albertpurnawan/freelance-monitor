"use client"

export function showToast(message: string, duration: number = 3000) {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, duration } }))
  } catch (e) {
    console.warn('toast dispatch failed', e)
  }
}

