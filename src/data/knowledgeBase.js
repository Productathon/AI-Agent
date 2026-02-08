/**
 * Knowledge Base - Dummy data for RAG system
 * Contains sample documents across various categories
 */

export const knowledgeBase = [
  // Product Information
  {
    id: "prod-001",
    title: "Premium Wireless Headphones",
    content: "Our Premium Wireless Headphones feature 40-hour battery life, active noise cancellation (ANC), and high-resolution audio support. They come with Bluetooth 5.3 connectivity, a comfortable over-ear design with memory foam cushions, and a foldable structure for easy portability. Available in Black, Silver, and Midnight Blue colors. Price: $249.99 with 2-year warranty.",
    category: "products"
  },
  {
    id: "prod-002", 
    title: "Smart Fitness Watch Pro",
    content: "The Smart Fitness Watch Pro tracks heart rate, blood oxygen, sleep patterns, and over 100 workout modes. It features a 1.4-inch AMOLED display, 7-day battery life, GPS tracking, and water resistance up to 50 meters. Compatible with iOS and Android. Includes stress monitoring, menstrual cycle tracking, and guided breathing exercises. Price: $199.99.",
    category: "products"
  },
  {
    id: "prod-003",
    title: "Ultra-Slim Laptop 15",
    content: "The Ultra-Slim Laptop 15 features a 15.6-inch 4K OLED display, Intel Core i7 processor, 16GB RAM, and 512GB SSD. Weighing only 1.5kg with a stunning aluminum unibody design. Includes Thunderbolt 4 ports, WiFi 6E, and a backlit keyboard. Battery lasts up to 14 hours. Ideal for creative professionals and business users. Price: $1,299.99.",
    category: "products"
  },

  // Company Policies
  {
    id: "policy-001",
    title: "Return Policy",
    content: "Our return policy allows returns within 30 days of purchase for a full refund. Items must be unused, in original packaging, and with receipt. Electronics must be returned within 15 days. Personalized items cannot be returned unless defective. Refunds are processed within 5-7 business days after receiving the returned item. Free return shipping is provided for defective products.",
    category: "policies"
  },
  {
    id: "policy-002",
    title: "Shipping Information",
    content: "We offer free standard shipping on orders over $50. Standard shipping takes 5-7 business days, express shipping takes 2-3 business days ($9.99), and overnight shipping is available for $24.99. International shipping is available to over 50 countries with delivery times of 7-14 business days. All orders are tracked and customers receive real-time updates via email.",
    category: "policies"
  },
  {
    id: "policy-003",
    title: "Warranty Coverage",
    content: "All products come with a minimum 1-year manufacturer warranty. Extended warranty options are available for 2-year ($29.99) or 3-year ($49.99) coverage. Warranty covers manufacturing defects, hardware failures, and battery degradation. Accidental damage is not covered under standard warranty but can be added with our Protection Plus plan. Claims can be submitted online or via phone.",
    category: "policies"
  },

  // FAQ
  {
    id: "faq-001",
    title: "How to Track My Order",
    content: "To track your order, log into your account and visit 'My Orders' section. Click on the order you want to track to see real-time shipping updates. You can also use the tracking number sent to your email directly on our carrier partner's website. For assistance, contact customer support at support@example.com or call 1-800-EXAMPLE.",
    category: "faq"
  },
  {
    id: "faq-002",
    title: "Payment Methods Accepted",
    content: "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, Google Pay, and Shop Pay. For orders over $100, we offer Buy Now Pay Later options through Affirm and Klarna with 0% APR for qualified customers. Gift cards and store credit can also be applied at checkout.",
    category: "faq"
  },
  {
    id: "faq-003",
    title: "Creating an Account",
    content: "Creating an account is free and takes less than 2 minutes. Click 'Sign Up' at the top of the page, enter your email and create a password. Benefits include faster checkout, order tracking, wishlist creation, exclusive member discounts, and early access to sales. You can also sign up using your Google, Facebook, or Apple account for one-click registration.",
    category: "faq"
  },

  // Technical Documentation
  {
    id: "tech-001",
    title: "API Rate Limits",
    content: "Our API has the following rate limits: Free tier - 100 requests/minute, Pro tier - 1000 requests/minute, Enterprise - unlimited with dedicated support. Rate limit headers are included in every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. When rate limited, the API returns HTTP 429 with a Retry-After header. API keys can be generated from the developer dashboard.",
    category: "technical"
  },
  {
    id: "tech-002",
    title: "Integration Guide",
    content: "To integrate with our platform, obtain an API key from the developer portal. All API calls require the key in the Authorization header as 'Bearer <api_key>'. Base URL: https://api.example.com/v1. Responses are JSON formatted. SDKs are available for Python, JavaScript, Ruby, and Go. Webhooks can be configured for real-time event notifications including order updates, inventory changes, and payment confirmations.",
    category: "technical"
  },
  {
    id: "tech-003",
    title: "Data Export Options",
    content: "Export your data in CSV, JSON, or XML formats from the dashboard. Available data includes order history, customer information, product catalog, and analytics reports. Automated exports can be scheduled daily, weekly, or monthly and sent to email or SFTP. Data exports comply with GDPR and CCPA requirements. Large exports are processed asynchronously with download links sent via email.",
    category: "technical"
  }
];

export default knowledgeBase;
