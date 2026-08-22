import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { buildBreadcrumbJsonLd, buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.contact);

export default function ContactPage() {
  return (
    <>
      <section className="space-y-6 bg-white pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="container-page mx-auto max-w-xl space-y-4">
          <RevealOnScroll>
            <h1 className="text-3xl leading-tight md:text-4xl">Свяжитесь с нами</h1>
          </RevealOnScroll>

          <RevealOnScroll delay={80}>
            <div className="rounded-2xl border border-solid border-border bg-surface-alt p-6 md:p-8">
              <ContactForm />
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Свяжитесь с нами", path: pages.contact.path },
          ]),
        ]}
      />
    </>
  );
}
