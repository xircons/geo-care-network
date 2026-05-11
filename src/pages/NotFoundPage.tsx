import { Link } from "react-router-dom";
import WhaleState from "../components/WhaleState";

export default function NotFoundPage() {
  return (
    <div>
      <WhaleState label="Page not found" />
      <div style={{ textAlign: "center" }}>
        <Link to="/">Go back to map</Link>
      </div>
    </div>
  );
}
