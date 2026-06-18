import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, type ApiItemResponse } from "@/lib/api";

type ApplicationDetail = {
  id: string;
  status: "PENDING" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
  paymentStatus: "NOT_READY" | "PENDING" | "PAID" | "FAILED";
  paymentAmount?: number | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  college?: { name: string } | null;
  certificationCourse?: { title: string } | null;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ApplicationPayment() {
  const { id } = useParams();
  const { toast } = useToast();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const response = await apiGet<ApiItemResponse<ApplicationDetail>>(`/applications/${id}`);
        setApplication(response.item);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const handlePayment = async () => {
    if (!application) return;
    setProcessing(true);
    setGatewayMessage(null);

    try {
      const orderResponse = await apiPost<
        { success: boolean; item: { keyId: string; orderId: string; amount: number; currency: string; applicantName: string; applicantEmail: string; applicantPhone: string } },
        Record<string, never>
      >(`/applications/${application.id}/create-payment-order`, {});

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setGatewayMessage("Razorpay checkout could not be loaded in this browser.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderResponse.item.keyId,
        amount: orderResponse.item.amount,
        currency: orderResponse.item.currency,
        order_id: orderResponse.item.orderId,
        name: "E-platform",
        description: "Application payment",
        prefill: {
          name: orderResponse.item.applicantName,
          email: orderResponse.item.applicantEmail,
          contact: orderResponse.item.applicantPhone
        },
        theme: {
          color: "#0891b2"
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          await apiPost(`/applications/${application.id}/verify-payment`, {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature
          });

          toast({ title: "Payment verified", description: "Your payment was verified successfully." });
          const refreshed = await apiGet<ApiItemResponse<ApplicationDetail>>(`/applications/${application.id}`);
          setApplication(refreshed.item);
        }
      });

      razorpay.open();
    } catch (error) {
      setGatewayMessage(error instanceof Error ? error.message : "Payment is not available right now.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !application) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading payment details...</p>
      </DashboardLayout>
    );
  }

  const target = application.college?.name ?? application.certificationCourse?.title ?? "Application";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Application Payment</h1>
          <p className="mt-1 text-muted-foreground">Complete the next step only after your application is accepted.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">{target}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Admission Status</p>
              <p className="mt-1 font-medium text-foreground">{application.status}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <p className="mt-1 font-medium text-foreground">{application.paymentStatus}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-4 md:col-span-2">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="mt-1 font-medium text-foreground">{application.paymentAmount ? `INR ${application.paymentAmount.toLocaleString("en-IN")}` : "Will be configured after acceptance"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success" />
            <p className="font-medium text-foreground">Secure payment flow</p>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Orders are created on the server and payment signatures are verified server-side before marking the payment as successful.</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Live transactions require valid Razorpay credentials on the backend.</p>
          </div>
        </div>

        {gatewayMessage && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            {gatewayMessage}
          </div>
        )}

        <Button
          onClick={() => void handlePayment()}
          disabled={processing || application.status !== "ACCEPTED" || application.paymentStatus === "PAID"}
          className="w-full gradient-primary text-primary-foreground border-0"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {application.paymentStatus === "PAID" ? "Payment Completed" : processing ? "Preparing payment..." : "Proceed to Payment"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
