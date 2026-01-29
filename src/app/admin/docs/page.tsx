import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { KlaviyoTestButton } from "./KlaviyoTestButton";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export default async function AdminDocsPage() {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    redirect("/");
  }

  return (
    <AdminLayout>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Documentation</h1>
        <p className="text-gray-400 mt-2">
          Setup guides and integration documentation
        </p>
      </div>

      {/* Klaviyo Setup */}
      <section className="bg-[#1a0a2e] border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Klaviyo Email Automation Setup
        </h2>

        <div className="space-y-6">
          {/* Step 1: API Key */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              1. Environment Variable
            </h3>
            <p className="text-gray-300 mb-3">
              Add your Klaviyo Private API Key to Vercel environment variables:
            </p>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm">
              <p className="text-gray-400">
                Vercel Dashboard → Settings → Environment Variables
              </p>
              <p className="text-green-400 mt-2">KLAVIYO_API_KEY=pk_xxxxxx</p>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your API key needs write access to Events and Profiles.
            </p>
          </div>

          {/* Step 2: Events */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              2. Events Being Tracked
            </h3>
            <p className="text-gray-300 mb-3">
              The system automatically sends these events to Klaviyo:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-500/20">
                    <th className="text-left py-2 px-3 text-gray-400">Event</th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      Trigger
                    </th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      Use Case
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Signed Up
                    </td>
                    <td className="py-2 px-3">When someone applies</td>
                    <td className="py-2 px-3">
                      Welcome/application received email
                    </td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Approved
                    </td>
                    <td className="py-2 px-3">Admin approves affiliate</td>
                    <td className="py-2 px-3">
                      Welcome + getting started email
                    </td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Referral
                    </td>
                    <td className="py-2 px-3">New sale attributed</td>
                    <td className="py-2 px-3">Commission notification email</td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Tier Upgrade
                    </td>
                    <td className="py-2 px-3">Tier promotion</td>
                    <td className="py-2 px-3">
                      Congratulations + new perks email
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Payout Sent
                    </td>
                    <td className="py-2 px-3">Payout completed</td>
                    <td className="py-2 px-3">Payment confirmation email</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 3: Create Flows */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              3. Create Flows in Klaviyo
            </h3>
            <p className="text-gray-300 mb-3">
              For each event, create a Flow in the Klaviyo dashboard:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
              <li>
                Go to{" "}
                <span className="text-[#d4af37]">
                  Klaviyo → Flows → Create Flow → Create from Scratch
                </span>
              </li>
              <li>
                Select <span className="text-[#d4af37]">Metric</span> as the
                trigger type
              </li>
              <li>
                Choose the event name (e.g.,{" "}
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  Affiliate Signed Up
                </code>
                )
              </li>
              <li>Add an Email action and design your template</li>
              <li>Use dynamic data from the event properties</li>
            </ol>
          </div>

          {/* Step 4: Template Variables */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              4. Available Template Variables
            </h3>
            <p className="text-gray-300 mb-3">
              Use these variables in your Klaviyo email templates:
            </p>

            <div className="space-y-4">
              {/* Signed Up / Approved */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Affiliate Signed Up / Approved
                </h4>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.referral_code</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.commission_rate</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.tier</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.affiliate_link</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                </div>
              </div>

              {/* Referral */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Affiliate Referral
                </h4>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.order_number</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.order_total</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.commission_amount</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.is_recurring</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                </div>
              </div>

              {/* Tier Upgrade */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Affiliate Tier Upgrade
                </h4>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.new_tier</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.old_tier</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.new_commission_rate</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.total_referrals</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                </div>
              </div>

              {/* Payout Sent */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  Affiliate Payout Sent
                </h4>
                <div className="font-mono text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.amount</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.method</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{"{{ "}</span>
                    <span className="text-green-400">event.paypal_email</span>
                    <span className="text-gray-500">{" }}"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Recommended Flows */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              5. Recommended Flow Configuration
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-500/20">
                    <th className="text-left py-2 px-3 text-gray-400">
                      Flow Name
                    </th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      Trigger Event
                    </th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      Timing
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3">Application Received</td>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Signed Up
                    </td>
                    <td className="py-2 px-3">Immediate</td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3">Welcome & Onboarding</td>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Approved
                    </td>
                    <td className="py-2 px-3">Immediate</td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3">New Sale Alert</td>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Referral
                    </td>
                    <td className="py-2 px-3">Immediate</td>
                  </tr>
                  <tr className="border-b border-red-500/10">
                    <td className="py-2 px-3">Tier Promotion</td>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Tier Upgrade
                    </td>
                    <td className="py-2 px-3">Immediate</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Payment Confirmation</td>
                    <td className="py-2 px-3 font-mono text-red-400">
                      Affiliate Payout Sent
                    </td>
                    <td className="py-2 px-3">Immediate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 6: Test Events */}
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              6. Test Klaviyo Events
            </h3>
            <p className="text-gray-300 mb-4">
              Send test events to Klaviyo to verify your integration and set up
              Flows. Events will appear in Klaviyo Analytics → Metrics.
            </p>
            <KlaviyoTestButton />
          </div>
        </div>
      </section>

      {/* PayPal Setup */}
      <section className="bg-[#1a0a2e] border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">PayPal Setup</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Required Environment Variables
            </h3>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm space-y-1">
              <p className="text-green-400">PAYPAL_CLIENT_ID=your_client_id</p>
              <p className="text-green-400">
                PAYPAL_CLIENT_SECRET=your_client_secret
              </p>
              <p className="text-green-400">
                PAYPAL_MODE=sandbox{" "}
                <span className="text-gray-500"># or &quot;live&quot;</span>
              </p>
              <p className="text-green-400">
                PAYPAL_WEBHOOK_ID=your_webhook_id{" "}
                <span className="text-gray-500"># for webhook verification</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Webhook Configuration
            </h3>
            <p className="text-gray-300 mb-3">
              Set up these webhook events in PayPal Developer Dashboard:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  PAYMENT.PAYOUTSBATCH.SUCCESS
                </code>
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  PAYMENT.PAYOUTSBATCH.DENIED
                </code>
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  PAYMENT.PAYOUTS-ITEM.SUCCEEDED
                </code>
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  PAYMENT.PAYOUTS-ITEM.FAILED
                </code>
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  PAYMENT.PAYOUTS-ITEM.UNCLAIMED
                </code>
              </li>
            </ul>
            <p className="text-gray-400 text-sm mt-3">
              Webhook URL:{" "}
              <code className="text-[#d4af37]">
                https://yourdomain.com/api/webhooks/paypal
              </code>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Status Polling
            </h3>
            <p className="text-gray-300">
              A cron job runs every 10 minutes to check the status of processing
              payouts. This ensures payouts are marked as completed/failed even
              if webhooks are missed.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Configured in{" "}
              <code className="text-[#d4af37]">vercel.json</code> - no
              additional setup required.
            </p>
          </div>
        </div>
      </section>

      {/* Shopify Setup */}
      <section className="bg-[#1a0a2e] border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Shopify Setup</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Required Environment Variables
            </h3>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm space-y-1">
              <p className="text-green-400">SHOPIFY_STORE_URL=your-store.myshopify.com</p>
              <p className="text-green-400">
                SHOPIFY_ACCESS_TOKEN=your_access_token
              </p>
              <p className="text-green-400">
                SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Webhook Configuration
            </h3>
            <p className="text-gray-300 mb-3">
              Set up these webhooks in Shopify Admin → Settings → Notifications:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  orders/paid
                </code>{" "}
                - Track new sales
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  refunds/create
                </code>{" "}
                - Handle refunds
              </li>
            </ul>
            <p className="text-gray-400 text-sm mt-3">
              Webhook URL:{" "}
              <code className="text-[#d4af37]">
                https://yourdomain.com/api/webhooks/shopify
              </code>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Discount Code Creation
            </h3>
            <p className="text-gray-300">
              Discount codes are automatically created when affiliates are
              approved. The system creates a Shopify price rule and discount
              code matching the affiliate&apos;s referral code.
            </p>
          </div>
        </div>
      </section>

      {/* Recharge Setup */}
      <section className="bg-[#1a0a2e] border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Recharge Setup (Subscriptions)
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Required Environment Variables
            </h3>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm space-y-1">
              <p className="text-green-400">RECHARGE_API_TOKEN=your_api_token</p>
              <p className="text-green-400">
                RECHARGE_WEBHOOK_SECRET=your_webhook_secret
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Webhook Configuration
            </h3>
            <p className="text-gray-300 mb-3">
              Set up these webhooks in Recharge → Integrations → Webhooks:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  charge/paid
                </code>{" "}
                - Track recurring charges
              </li>
              <li>
                <code className="text-red-400 bg-black/40 px-1 rounded">
                  charge/refunded
                </code>{" "}
                - Handle refunds
              </li>
            </ul>
            <p className="text-gray-400 text-sm mt-3">
              Webhook URL:{" "}
              <code className="text-[#d4af37]">
                https://yourdomain.com/api/webhooks/recharge
              </code>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
              Recurring Commission Tracking
            </h3>
            <p className="text-gray-300">
              Recurring subscription charges are automatically attributed to the
              original referring affiliate. The system tracks the customer
              relationship and applies the affiliate&apos;s commission rate to all
              future subscription renewals.
            </p>
          </div>
        </div>
      </section>

      {/* Error Monitoring */}
      <section className="bg-[#1a0a2e] border border-red-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Error Monitoring
        </h2>

        <p className="text-gray-300 mb-4">
          The system automatically logs errors from webhooks and API calls.
          Check the{" "}
          <a href="/admin/errors" className="text-[#d4af37] hover:underline">
            Error Monitor
          </a>{" "}
          page to view and resolve issues.
        </p>

        <div>
          <h3 className="text-lg font-semibold text-[#d4af37] mb-2">
            Error Severity Levels
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                critical
              </span>
              <span>Requires immediate attention (e.g., payment failures)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                error
              </span>
              <span>Failed operations that need investigation</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                warning
              </span>
              <span>Non-critical issues to monitor</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                info
              </span>
              <span>Informational logs</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
    </AdminLayout>
  );
}
