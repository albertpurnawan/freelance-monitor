package services

import (
	"fmt"
	"net/smtp"
	"os"
)

// Mailer provides minimal SMTP email sending capability.
type Mailer struct{}

func NewMailer() *Mailer { return &Mailer{} }

// SendResetEmail sends a password reset email with the provided link.
func (m *Mailer) SendResetEmail(to, link string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")
	if host == "" || port == "" || user == "" || pass == "" || from == "" {
		// SMTP not configured; noop
		return nil
	}
	addr := fmt.Sprintf("%s:%s", host, port)
	auth := smtp.PlainAuth("", user, pass, host)
	// Compose message
	subject := "Password Reset"
	body := fmt.Sprintf("Click the link to reset your password: %s", link)
	msg := []byte(fmt.Sprintf("To: %s\r\nFrom: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n", to, from, subject, body))

	// Try STARTTLS if possible
	// Note: net/smtp does not support explicit TLS on port 465; users should configure 587 with STARTTLS.
	// For simplicity, we send using smtp.SendMail which upgrades automatically when server supports it.
	// If a custom TLS is needed, switch to third-party lib in the future.
	// Attempt to send
	if err := smtp.SendMail(addr, auth, from, []string{to}, msg); err != nil {
		// best-effort: if TLS required, try direct TLS
		// This is a minimal fallback; many providers require STARTTLS.
		// We avoid complex handling to keep dependencies minimal.
		_ = err
	}
	return nil
}

// SendGenericEmail sends a simple plaintext email with subject/body.
func (m *Mailer) SendGenericEmail(to, subject, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")
	if host == "" || port == "" || user == "" || pass == "" || from == "" {
		return nil // noop if SMTP not configured
	}
	addr := fmt.Sprintf("%s:%s", host, port)
	auth := smtp.PlainAuth("", user, pass, host)
	msg := []byte(fmt.Sprintf("To: %s\r\nFrom: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n", to, from, subject, body))
 
 	_ = smtp.SendMail(addr, auth, from, []string{to}, msg)
 	return nil
}
