/** Rendert JSON-LD veilig in een <script type="application/ld+json">. */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      // JSON.stringify levert geen </script>; we escapen < voor de zekerheid.
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }}
    />
  );
}
