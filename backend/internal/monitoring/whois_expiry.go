package monitoring

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

var tldWhois = map[string]string{
	"com": "whois.verisign-grs.com",
	"net": "whois.verisign-grs.com",
	"org": "whois.pir.org",
	"io":  "whois.nic.io",
	"dev": "whois.nic.google",
	"app": "whois.nic.google",
}

// whoisServer returns a best-effort whois server for a domain's TLD.
func whoisServer(domain string) string {
	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return ""
	}
	tld := strings.ToLower(parts[len(parts)-1])
	if s, ok := tldWhois[tld]; ok {
		return s
	}
	return "whois.iana.org"
}

func whoisQuery(server, domain string, timeout time.Duration) (string, error) {
	d := net.Dialer{Timeout: timeout}
	conn, err := d.Dial("tcp", net.JoinHostPort(server, "43"))
	if err != nil {
		return "", err
	}
	defer conn.Close()
	if _, err := fmt.Fprintf(conn, "%s\r\n", domain); err != nil {
		return "", err
	}
	var b strings.Builder
	rd := bufio.NewReader(conn)
	for {
		line, err := rd.ReadString('\n')
		if line != "" {
			b.WriteString(line)
		}
		if err != nil {
			break
		}
	}
	return b.String(), nil
}

var expiryKeys = []string{
	"Registry Expiry Date", // .com/.net
	"Registrar Registration Expiration Date",
	"Expiration Time",
	"Expiry Date",
	"paid-till", // some ccTLDs
}

var dateLayouts = []string{
	time.RFC3339,
	"2006-01-02T15:04:05Z0700",
	"2006-01-02 15:04:05Z",
	"2006-01-02 15:04:05-0700",
	"2006-01-02",
	"2006.01.02",
}

// parseExpiry scans whois text for known expiry keys and parses time.
func parseExpiry(text string) (*time.Time, error) {
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		l := strings.TrimSpace(line)
		for _, k := range expiryKeys {
			if strings.HasPrefix(strings.ToLower(l), strings.ToLower(k)) {
				// Split on ':' and take the tail
				parts := strings.SplitN(l, ":", 2)
				if len(parts) < 2 {
					continue
				}
				val := strings.TrimSpace(parts[1])
				// Strip trailing comments
				val = strings.SplitN(val, " ", 2)[0]
				// Try regex for date tokens if space split removed too much
				if val == "" {
					re := regexp.MustCompile(`([0-9]{4}[-.][0-9]{2}[-.][0-9]{2}([T ][0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{4})?)?)`)
					if m := re.FindString(l); m != "" {
						val = m
					}
				}
				for _, layout := range dateLayouts {
					if t, err := time.Parse(layout, val); err == nil {
						return &t, nil
					}
				}
			}
		}
	}
	return nil, errors.New("expiry not found")
}

// FetchDomainExpiry tries to determine domain expiry via WHOIS.
func FetchDomainExpiry(domain string, timeout time.Duration) (*time.Time, error) {
	srv := whoisServer(domain)
	txt, err := whoisQuery(srv, domain, timeout)
	if err != nil {
		return nil, err
	}
	// For IANA, follow referral if present
	if srv == "whois.iana.org" {
		ref := ""
		for _, line := range strings.Split(txt, "\n") {
			if strings.HasPrefix(strings.ToLower(strings.TrimSpace(line)), "whois:") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					ref = strings.TrimSpace(parts[1])
				}
				break
			}
		}
		if ref != "" {
			if t2, err2 := whoisQuery(ref, domain, timeout); err2 == nil {
				if exp, perr := parseExpiry(t2); perr == nil {
					return exp, nil
				}
			}
		}
	}
	if exp, err := parseExpiry(txt); err == nil {
		return exp, nil
	}
	return nil, errors.New("unparsed whois")
}
