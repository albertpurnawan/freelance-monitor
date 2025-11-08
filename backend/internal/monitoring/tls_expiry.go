package monitoring

import (
	"crypto/tls"
	"net"
	"strings"
	"time"
)

// FetchTLSExpiry returns the NotAfter time for a host:port (default 443) if available.
func FetchTLSExpiry(hostport string, timeout time.Duration) (*time.Time, error) {
	host := hostport
	if !strings.Contains(hostport, ":") {
		host = hostport + ":443"
	}
	d := &net.Dialer{Timeout: timeout}
	conn, err := tls.DialWithDialer(d, "tcp", host, &tls.Config{InsecureSkipVerify: true})
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	state := conn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return nil, nil
	}
	exp := state.PeerCertificates[0].NotAfter
	return &exp, nil
}
