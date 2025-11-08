package integrations

// Cloudflare DNS (dry-run stub). In real implementation, call provider API.
type CloudflareClient struct{}

func NewCloudflareClient() *CloudflareClient { return &CloudflareClient{} }

type DNSChange struct {
	Domain string `json:"domain"`
	Type   string `json:"type"`
	Name   string `json:"name"`
	Value  string `json:"value"`
	TTL    int    `json:"ttl"`
}

// PlanChanges returns a plan of changes that would be applied.
func (c *CloudflareClient) PlanChanges(ch []DNSChange) ([]DNSChange, error) { return ch, nil }
