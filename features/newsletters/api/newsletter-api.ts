import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: () =>
      apiRequest<NewsletterSubscriber[]>({
        path: "/admin/newsletters/subscribers",
      }),
  });
}

export function useSendNewsletter() {
  return useMutation({
    mutationFn: (payload: { subject: string; html: string }) =>
      apiRequest({
        path: "/admin/newsletters/send",
        method: "POST",
        body: payload,
      }),
  });
}

export type SentNewsletter = {
  id: string;
  subject: string;
  htmlContent: string;
  recipientCount: number;
  sentAt: string;
};

export function useSentNewsletters() {
  return useQuery({
    queryKey: ["sent-newsletters"],
    queryFn: () =>
      apiRequest<SentNewsletter[]>({
        path: "/admin/newsletters/sent",
      }),
  });
}

export function useDeleteSubscriber() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        path: `/admin/newsletters/subscribers/${id}`,
        method: "DELETE",
      }),
  });
}
