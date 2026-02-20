import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1 className="title">Humor Project</h1>

      <div className="row">
        <Link className="button" href="/captions">
          Rate Captions
        </Link>
      </div>
    </main>
  );
}