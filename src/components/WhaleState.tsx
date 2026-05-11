export default function WhaleState({ label }: { label: string }) {
  return <div style={{ textAlign: "center", padding: 20 }}><svg width="120" height="70" viewBox="0 0 240 140"><path d="M22 89c10-22 36-36 64-36 39 0 68 22 102 22 9 0 20-2 30-7-4 16-16 30-33 36-8 3-18 5-28 5H94c-32 0-58-8-72-20z" fill="#0EA5E9" /></svg><p>{label}</p></div>;
}
