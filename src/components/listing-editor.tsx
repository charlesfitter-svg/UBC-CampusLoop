"use client";
import { useRouter } from "next/navigation";
import { useClock } from "@/lib/use-clock";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Leaf,
  LoaderCircle,
  MapPin,
  Sparkles,
  Upload,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { backendConfigured, browserSupabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress";
import { aiDraftSchema, type AIDraft } from "@/lib/ai";
import {
  foodCategories,
  imageUrl,
  landmarks,
  listingSchema,
  money,
  subcategories,
  validateDeadline,
  type Landmark,
  type Listing,
} from "@/lib/marketplace";
const localTime = (time: number) => {
  const d = new Date(time);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const initial = () => ({
  title: "",
  description: "",
  category: "items" as "food" | "items",
  subcategory: "Other",
  price: "0",
  quantity: "1",
  landmark: "nest" as Landmark,
  expires: "",
  food_details: "",
});
type Form = ReturnType<typeof initial>;
export function ListingEditor({ existing }: { existing?: Listing }) {
  const router = useRouter();
  const now = useClock();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<Form>(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(
    existing ? imageUrl(existing.image_path) : "",
  );
  const [analysis, setAnalysis] = useState<AIDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restored, setRestored] = useState(false);
  const [manual, setManual] = useState(Boolean(existing));
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const uploaded = useRef<string | null>(existing?.image_path ?? null);
  useEffect(() => {
    // Synchronize persisted browser draft and device-local deadline after hydration.
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize existing record after hydration.
      setForm({
        title: existing.title,
        description: existing.description,
        category: existing.category,
        subcategory: existing.subcategory,
        price: String(existing.price_cents / 100),
        quantity: String(existing.quantity),
        landmark: existing.landmark,
        expires: localTime(Date.parse(existing.expires_at)),
        food_details: existing.food_details ?? "",
      });
      return;
    }
    // Keep edits through login/reloads. Photos stay in memory and must be reattached after reload.
    try {
      const saved = sessionStorage.getItem("campusloop-draft");
      if (saved) {
        setForm({ ...initial(), ...JSON.parse(saved) });
        setRestored(true);
      } else {
        setForm((f) => ({
          ...f,
          expires: localTime(Date.now() + 7 * 86400000),
        }));
        const preferred = localStorage.getItem("campusloop-landmark");
        if (preferred && preferred in landmarks)
          setForm((f) => ({ ...f, landmark: preferred as Landmark }));
      }
    } catch {}
  }, [existing]);
  useEffect(() => {
    if (!existing && restored) {
      sessionStorage.setItem("campusloop-draft", JSON.stringify(form));
    }
  }, [form, existing, restored]);
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!user || existing) return;
    browserSupabase()
      .from("profiles")
      .select("preferred_landmark")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !sessionStorage.getItem("campusloop-draft"))
          setForm((f) => ({ ...f, landmark: data.preferred_landmark }));
      });
  }, [user, existing]);
  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setRestored(true);
  }
  async function choose(file?: File) {
    if (!file) return;
    setError("");
    setBusy("photo");
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed));
      setAnalysis(null);
      uploaded.current = null;
      setMessage(
        "Photo ready. Let AI do the writing, or add details yourself.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function analyse() {
    if (!photo) return;
    setBusy("ai");
    setError("");
    setMessage("");
    try {
      const data = new FormData();
      data.set("image", photo);
      const res = await fetch("/api/ai/listing", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Could not analyse the photo.");
      const draft = aiDraftSchema.parse(json.draft);
      setAnalysis(draft);
      setForm((f) => ({
        ...f,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        subcategory: draft.subcategory,
        expires:
          draft.category === "food"
            ? localTime(Date.now() + 6 * 3600000)
            : f.expires,
      }));
      setRestored(true);
      setManual(true);
      setMessage(
        "Your draft is ready. Check the details, choose a pickup spot, and share.",
      );
    } catch (e) {
      setError((e as Error).message);
      setManual(true);
    } finally {
      setBusy("");
    }
  }
  async function publish(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!user) {
      setError(
        "Log in to publish. Your photo and edits stay here while this page remains open.",
      );
      return;
    }
    if (!preview) {
      setError("Add a photograph first.");
      return;
    }
    setBusy("publish");
    try {
      const deadline = new Date(form.expires).toISOString();
      const deadlineError = validateDeadline(deadline, form.category);
      if (deadlineError) throw new Error(deadlineError);
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        price_cents: Math.round(Number(form.price) * 100),
        quantity: Number(form.quantity),
        landmark: form.landmark,
        expires_at: deadline,
        image_path: uploaded.current ?? "pending",
        food_details: form.category === "food" ? form.food_details : null,
      };
      const valid = listingSchema.safeParse(payload);
      if (!valid.success) throw new Error(valid.error.issues[0].message);
      const db = browserSupabase();
      if (!uploaded.current) {
        if (!photo) throw new Error("Please reattach your photo.");
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await db.storage
          .from("listing-images")
          .upload(path, photo, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        uploaded.current = path;
      }
      const { data, error } = await db.rpc("save_listing", {
        p_data: { ...payload, image_path: uploaded.current },
        p_id: existing?.id ?? null,
      });
      if (error) throw error;
      localStorage.setItem("campusloop-landmark", form.landmark);
      await db
        .from("profiles")
        .update({ preferred_landmark: form.landmark })
        .eq("id", user.id);
      sessionStorage.removeItem("campusloop-draft");
      router.push(`/listings/${data}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const categories = subcategories.filter((c) =>
    form.category === "food"
      ? foodCategories.includes(c)
      : !["Bakery", "Meals", "Produce"].includes(c),
  );
  if (existing && !loading && existing.seller_id !== user?.id)
    return (
      <div className="shell page-section empty-state">
        <h1>This listing belongs to someone else.</h1>
        <Link href="/">Back to marketplace</Link>
      </div>
    );
  return (
    <section className="shell page-section">
      <Link
        href={existing ? `/listings/${existing.id}` : "/"}
        className="back-link"
      >
        <ArrowLeft size={16} />
        Back to {existing ? "listing" : "the loop"}
      </Link>
      <div className="page-intro">
        <span className="eyebrow">
          <Sparkles size={13} /> GIVE IT ANOTHER LOOP
        </span>
        <h1>
          {existing ? (
            "A little update."
          ) : (
            <>
              One photo.
              <br className="mobile-only" /> So much possibility.
            </>
          )}
        </h1>
        <p>
          {existing
            ? "Keep your neighbours in the loop."
            : "Snap something you’re ready to share. We’ll help with the words."}
        </p>
      </div>
      {!backendConfigured() && (
        <div className="notice">
          Preview mode · Try the photo and manual editor. Connect Supabase to
          publish, and OpenAI to generate real AI drafts.
        </div>
      )}
      {restored && !existing && !photo && (
        <p className="fine">
          Your text draft is saved in this tab. Reattach your photo after a
          reload.
        </p>
      )}
      <div className="editor-layout">
        <div className="editor-photo-col">
          <div
            className={`photo-drop ${preview ? "has-photo" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Your listing photograph" />
                <button
                  disabled={!!busy}
                  className="button light small change-photo"
                  onClick={() => input.current?.click()}
                >
                  <Camera size={15} />
                  Change photo
                </button>
                <span className="photo-stamp">
                  <Check size={13} />
                  Your original photo
                </span>
              </>
            ) : (
              <>
                <div className="upload-orbit">
                  <ImagePlus size={38} />
                  <Sparkles size={17} />
                </div>
                <h2>Start with a photo</h2>
                <p>
                  A clear photo is all you need.
                  <br />
                  Drag it here, or pick one below.
                </p>
                <button
                  disabled={!!busy}
                  onClick={() => input.current?.click()}
                  className="button"
                >
                  <Upload size={17} />
                  {busy === "photo" ? "Preparing…" : "Upload a photo"}
                </button>
                <button
                  onClick={() => camera.current?.click()}
                  className="text-link camera-action"
                  disabled={!!busy}
                >
                  <Camera size={17} />
                  Take a photo
                </button>
                <span className="fine">
                  JPEG, PNG or WebP · Up to 20 MB
                  <br />
                  Resized on your device before upload
                </span>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <input
              ref={camera}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </div>
          {!existing && (
            <div className="ai-action-card">
              <div>
                <Sparkles size={22} />
                <span>
                  <strong>A little AI magic</strong>
                  <small>Your photo → a nearly finished listing</small>
                </span>
              </div>
              <button
                className="button full"
                onClick={analyse}
                disabled={!photo || !!busy || !user}
              >
                {busy === "ai" ? (
                  <>
                    <LoaderCircle size={16} className="spin" />
                    Looking at the details…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {analysis ? "Generate again" : "Generate my listing"}
                  </>
                )}
              </button>
              {!user && (
                <p className="fine">
                  <Link href="/auth?next=/list/new" target="_blank">
                    Log in in a new tab
                  </Link>{" "}
                  to use AI; return here to keep your photo.
                </p>
              )}
              <p className="fine">
                AI suggests. You decide. We never guess safety, condition, or
                value.
              </p>
            </div>
          )}
          <div className="listing-mini-preview">
            <span className="eyebrow">YOUR LISTING AT A GLANCE</span>
            <div className="card-title">
              <h3>{form.title || "Your next good thing"}</h3>
              <strong className="price free">
                {money(Math.max(0, Math.round(Number(form.price || 0) * 100)))}
              </strong>
            </div>
            <p>
              <MapPin size={14} />
              {landmarks[form.landmark].name}
            </p>
          </div>
        </div>
        <form ref={formRef} onSubmit={publish} className="panel listing-form">
          <div className="form-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Make it yours</h2>
              <p>
                {analysis
                  ? "AI did the first draft. Give it a quick once-over."
                  : "A few little details, and it’s ready for a new home."}
              </p>
            </div>
            {!manual && !existing && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setManual(true);
                  formRef.current
                    ?.querySelector<HTMLInputElement>("input")
                    ?.focus();
                }}
              >
                Write it myself
              </button>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice success" role="status">
              {message}
            </div>
          )}
          {analysis && (
            <div className="ai-checks">
              <strong>
                <Sparkles size={14} />
                Photo draft generated
              </strong>
              {analysis.visible_details.length > 0 && (
                <p>Visible: {analysis.visible_details.join(" · ")}</p>
              )}
              {analysis.seller_checks.length > 0 && (
                <p>Please confirm: {analysis.seller_checks.join(" · ")}</p>
              )}
            </div>
          )}
          <label>
            Listing title
            <input
              required
              minLength={3}
              maxLength={100}
              placeholder="e.g. A desk lamp for your study nook"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              What are you sharing?
              <select
                value={form.category}
                onChange={(e) => {
                  const cat = e.target.value as "food" | "items";
                  setForm((f) => ({
                    ...f,
                    category: cat,
                    subcategory: "Other",
                    expires: localTime(
                      Date.now() +
                        (cat === "food" ? 6 * 3600000 : 7 * 86400000),
                    ),
                  }));
                  setRestored(true);
                }}
              >
                <option value="items">Reusable item</option>
                <option value="food">Surplus food</option>
              </select>
            </label>
            <label>
              Category
              <select
                value={form.subcategory}
                onChange={(e) => update("subcategory", e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            A little about it
            <textarea
              required
              minLength={10}
              maxLength={1600}
              rows={4}
              placeholder="What would a neighbour want to know? Keep it honest and simple."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <div className="price-toggle">
            <span>Pass it on for free?</span>
            <button
              type="button"
              aria-label="Pass it on for free?"
              className={Number(form.price) === 0 ? "toggle active" : "toggle"}
              aria-pressed={Number(form.price) === 0}
              onClick={() =>
                update("price", Number(form.price) === 0 ? "5" : "0")
              }
            >
              <span />
            </button>
            <strong>
              {Number(form.price) === 0
                ? "Yes, spread the good"
                : "Set a little price"}
            </strong>
          </div>
          <div className="form-row">
            {Number(form.price) !== 0 && (
              <label>
                Price per unit (CAD)
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                />
                <small>Reserved now. Paid directly at pickup.</small>
              </label>
            )}
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max="100"
                required
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
              />
            </label>
          </div>
          <label>
            Meet at a campus landmark
            <select
              value={form.landmark}
              onChange={(e) => update("landmark", e.target.value as Landmark)}
            >
              {Object.entries(landmarks).map(([id, l]) => (
                <option key={id} value={id}>
                  {l.name}
                </option>
              ))}
            </select>
            <small>
              {landmarks[form.landmark].note}. Your last choice is remembered.
            </small>
          </label>
          <label>
            {form.category === "food"
              ? "Pick up food by"
              : "Listing available until"}
            <input
              type="datetime-local"
              required
              value={form.expires}
              min={now ? localTime(now) : undefined}
              max={
                now
                  ? localTime(
                      now + (form.category === "food" ? 2 : 31) * 86400000,
                    )
                  : undefined
              }
              onChange={(e) => update("expires", e.target.value)}
            />
            <small>
              Your device’s local time.{" "}
              {form.category === "food"
                ? "Within 48 hours; choose a safe, realistic pickup window."
                : "Defaults to one week. You can change it."}
            </small>
          </label>
          {form.category === "food" && (
            <label>
              Seller-verified food details
              <textarea
                required
                minLength={5}
                maxLength={800}
                rows={3}
                placeholder="Verify contents and known allergens, storage/handling, and any known preparation information. State what is unknown; never guess."
                value={form.food_details}
                onChange={(e) => update("food_details", e.target.value)}
              />
              <small>
                AI cannot determine food safety or allergens. Only share food
                you can responsibly redistribute.
              </small>
            </label>
          )}
          <div className="publish-footer">
            <p>
              <Leaf size={15} /> One less thing going to waste.
            </p>
            <button className="button full" disabled={!!busy || loading}>
              {busy === "publish" ? (
                <>
                  <LoaderCircle size={17} className="spin" />
                  Publishing…
                </>
              ) : (
                <>
                  {existing ? "Save changes" : "Publish listing"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
            {!user && (
              <p className="fine">
                <Link target="_blank" href="/auth?next=/list/new">
                  Log in or create an account in a new tab
                </Link>
                , then return to publish.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
