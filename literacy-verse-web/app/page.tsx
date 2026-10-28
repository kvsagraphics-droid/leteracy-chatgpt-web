"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, AudioLines, BookMarked, BookOpen, Check, ChevronDown,
  CircleHelp, Compass, Feather, Globe2, HeartHandshake, Languages, Library, LogIn,
  LogOut, Menu, MessageCircle, Mic2, NotebookPen, Play, Plus, Search, Send,
  ShieldCheck, Sparkles, Sprout, UploadCloud, UserRound, Users, X, Youtube
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AppRole, languageOptions, ResourceType, sampleBooks, sampleCampaigns, samplePodcasts, t, youtubeEmbedUrl } from "@/lib/content";

const NAV = [
  { id: "home", key: "home", icon: Compass },
  { id: "ai", key: "ai", icon: Sparkles },
  { id: "podcasts", key: "podcasts", icon: AudioLines },
  { id: "library", key: "library", icon: Library },
  { id: "fund", key: "fund", icon: HeartHandshake },
  { id: "about", key: "about", icon: CircleHelp },
];

function normalizeRole(value: any): AppRole {
  return ["student", "teacher", "volunteer", "admin"].includes(value) ? value : "student";
}

function prettyType(type: string, language: string) {
  if (type === "pdf") return t(language, "pdf");
  if (type === "story") return t(language, "story");
  if (type === "poem") return t(language, "poem");
  return t(language, "note");
}

function getBookIcon(type: string) {
  if (type === "poem") return Feather;
  if (type === "note") return NotebookPen;
  if (type === "story") return Sprout;
  return BookOpen;
}

export default function HomePage() {
  const [language, setLanguage] = useState("en");
  const [languageModal, setLanguageModal] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [demoSession, setDemoSession] = useState(false);
  const [demoRole, setDemoRole] = useState<AppRole>("student");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState<"student" | "teacher" | "volunteer">("student");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"info" | "success" | "error">("info");
  const [books, setBooks] = useState<any[]>(sampleBooks as any[]);
  const [podcasts, setPodcasts] = useState<any[]>(samplePodcasts as any[]);
  const [campaigns, setCampaigns] = useState<any[]>(sampleCampaigns as any[]);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceModal, setResourceModal] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceAuthor, setResourceAuthor] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("pdf");
  const [resourceBody, setResourceBody] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceBusy, setResourceBusy] = useState(false);
  const [podcastTitle, setPodcastTitle] = useState("");
  const [podcastDescription, setPodcastDescription] = useState("");
  const [podcastUrl, setPodcastUrl] = useState("");
  const [podcastBusy, setPodcastBusy] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [pledgeCampaign, setPledgeCampaign] = useState<any>(null);
  const [pledgeAmount, setPledgeAmount] = useState("10");
  const [pledgeBusy, setPledgeBusy] = useState(false);
  const [activeBook, setActiveBook] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const user = session?.user ?? null;
  const role: AppRole | null = profile?.role ? normalizeRole(profile.role) : demoSession ? demoRole : null;
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || (demoSession ? "Demo visitor" : "");
  const isSignedIn = Boolean(user || demoSession);
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher" || isAdmin;
  const canVolunteer = role === "volunteer" || isAdmin;

  const notify = useCallback((message: string, kind: "info" | "success" | "error" = "info") => {
    setNotice(message);
    setNoticeKind(kind);
    if (message) window.setTimeout(() => setNotice((current) => current === message ? "" : current), 5200);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("id,email,display_name,role").eq("id", userId).maybeSingle();
    if (!error && data) setProfile(data);
  }, []);

  const loadContent = useCallback(async () => {
    if (!supabase) return;
    const [bookResult, podcastResult, campaignResult] = await Promise.all([
      supabase.from("books").select("*").order("created_at", { ascending: false }),
      supabase.from("podcasts").select("*").eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("fundraisers").select("*").eq("status", "active").order("created_at", { ascending: false }),
    ]);
    if (!bookResult.error && bookResult.data) setBooks(bookResult.data);
    if (!podcastResult.error && podcastResult.data) setPodcasts(podcastResult.data);
    if (!campaignResult.error && campaignResult.data?.length) setCampaigns(campaignResult.data);
  }, []);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("lv-language");
    const browserCode = (navigator.language || "en").split("-")[0].toLowerCase();
    const supported = languageOptions.some((item) => item.code === browserCode);
    if (storedLang) setLanguage(storedLang);
    else {
      setLanguage(supported ? browserCode : "en");
      setLanguageModal(true);
    }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) window.setTimeout(() => loadProfile(nextSession.user.id), 0);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => { loadContent(); }, [loadContent, isSignedIn]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chatMessages, chatBusy]);

  const changeLanguage = (code: string) => {
    setLanguage(code);
    window.localStorage.setItem("lv-language", code);
    setLanguageModal(false);
  };

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setMobileMenu(false);
    setActiveBook(null);
    if (tab === "fund" && !isSignedIn) notify(t(language, "loginRequired"));
    if (tab === "admin" && !isAdmin) notify(t(language, "adminOnly"), "error");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAuth = (mode: "signin" | "signup" = "signin") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setNotice("");
  };

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return notify("Enter an email address and password.", "error");
    setAuthBusy(true);
    try {
      if (!supabase) {
        setDemoSession(true);
        setDemoRole(authMode === "signup" ? authRole : "student");
        setProfile({ display_name: authName.trim() || authEmail.split("@")[0], email: authEmail, role: authMode === "signup" ? authRole : "student" });
        setAuthOpen(false);
        setAuthPassword("");
        notify("Demo session started. Configure Supabase for secure accounts and shared data.", "success");
        return;
      }
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(), password: authPassword,
          options: { data: { display_name: authName.trim(), role: authRole } }
        });
        if (error) throw error;
        if (data.session?.user) await loadProfile(data.session.user.id);
        setAuthOpen(false);
        setAuthPassword("");
        notify(data.session ? "Account created successfully." : "Account created. Check your email to confirm it, then sign in.", "success");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (data.user) await loadProfile(data.user.id);
        setAuthOpen(false);
        setAuthPassword("");
        notify("You are signed in.", "success");
      }
    } catch (error: any) {
      notify(error?.message || "Unable to sign in. Please try again.", "error");
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    if (supabase && user) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDemoSession(false);
    setDemoRole("student");
    setActiveTab("home");
    notify("You have signed out.", "success");
  };

  const submitResource = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSignedIn) return openAuth("signin");
    if (!supabase && resourceFile) return notify("PDF file storage requires Supabase. Configure the backend before uploading files; preview mode cannot save the PDF.", "error");
    if (resourceType !== "pdf" && !isTeacher) return notify("Only teacher accounts can create stories, poems, and notes.", "error");
    if (!resourceTitle.trim()) return notify("Add a title first.", "error");
    if (resourceType === "pdf" && !resourceFile && !resourceBody.trim()) return notify("Choose a PDF file or add text content.", "error");
    setResourceBusy(true);
    try {
      let filePath: string | null = null;
      if (supabase && user && resourceFile) {
        if (resourceFile.type !== "application/pdf") throw new Error("Please upload a PDF file.");
        if (resourceFile.size > 15 * 1024 * 1024) throw new Error("PDF files must be 15 MB or smaller.");
        const safeName = resourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        filePath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("book-files").upload(filePath, resourceFile, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw uploadError;
      }
      const nextBook = {
        id: `local-${Date.now()}`, title: resourceTitle.trim(), author: resourceAuthor.trim() || displayName || "Community contributor",
        description: resourceDescription.trim(), resource_type: resourceType, body: resourceBody.trim() || null,
        file_path: filePath, status: "pending", submitted_by: user?.id || null, is_featured: false, created_at: new Date().toISOString()
      };
      if (supabase && user) {
        const { error } = await supabase.from("books").insert({ ...nextBook, id: undefined });
        if (error) throw error;
        await loadContent();
      } else {
        setBooks((prev) => [nextBook, ...prev]);
      }
      setResourceModal(false);
      setResourceTitle(""); setResourceAuthor(""); setResourceDescription(""); setResourceBody(""); setResourceFile(null); setResourceType("pdf");
      notify("Resource submitted for review. An administrator must approve it before publication.", "success");
    } catch (error: any) {
      notify(error?.message || "Could not submit this resource.", "error");
    } finally { setResourceBusy(false); }
  };

  const updateBookStatus = async (book: any, status: "published" | "rejected") => {
    if (!isAdmin || !supabase) return notify("Admin access requires a configured Supabase project and an admin profile.", "error");
    const { error } = await supabase.from("books").update({ status }).eq("id", book.id);
    if (error) return notify(error.message, "error");
    await loadContent();
    notify(status === "published" ? "Resource published." : "Resource rejected.", "success");
  };

  const addPodcast = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin || !supabase) return notify("Admin publishing requires a configured admin account.", "error");
    if (!podcastTitle.trim() || !podcastUrl.trim()) return notify("Enter a title and a video URL.", "error");
    try {
      new URL(podcastUrl.trim());
    } catch { return notify("Please enter a valid video URL.", "error"); }
    setPodcastBusy(true);
    try {
      const { error } = await supabase.from("podcasts").insert({ title: podcastTitle.trim(), description: podcastDescription.trim(), video_url: podcastUrl.trim(), status: "published", created_by: user.id });
      if (error) throw error;
      setPodcastTitle(""); setPodcastDescription(""); setPodcastUrl("");
      await loadContent();
      notify("Podcast published.", "success");
    } catch (error: any) { notify(error?.message || "Could not publish this podcast.", "error"); }
    finally { setPodcastBusy(false); }
  };

  const askTutor = async (event: FormEvent) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    const updated = [...chatMessages, { role: "user", content: message }];
    setChatMessages(updated);
    setChatInput(""); setChatBusy(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, language, grade: role === "teacher" ? "educator" : "learner", history: chatMessages.slice(-8) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The tutor is temporarily unavailable.");
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply, demo: data.demo }]);
    } catch (error: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: error?.message || "Please try again shortly." }]);
    } finally { setChatBusy(false); }
  };

  const downloadBook = async (book: any) => {
    if (book.file_path && supabase) {
      const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.file_path, 60);
      if (error || !data?.signedUrl) return notify("Could not open this PDF. Please try again.", "error");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else if (book.body) setActiveBook(book);
    else notify("This preview item does not contain a downloadable file yet.");
  };

  const recordPledge = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSignedIn) return openAuth("signin");
    const amount = Number(pledgeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return notify("Enter a valid positive amount.", "error");
    setPledgeBusy(true);
    try {
      if (supabase && user) {
        const { error } = await supabase.from("donations").insert({ user_id: user.id, fundraiser_id: pledgeCampaign.id, amount, currency: pledgeCampaign.currency || "USD", status: "pledged" });
        if (error) throw error;
      }
      setPledgeCampaign(null);
      notify("Your pledge has been recorded for this prototype. No payment has been processed.", "success");
    } catch (error: any) { notify(error?.message || "Could not record pledge.", "error"); }
    finally { setPledgeBusy(false); }
  };

  const filteredBooks = useMemo(() => books.filter((book) => book.status === "published" && `${book.title} ${book.author} ${book.description} ${book.resource_type}`.toLowerCase().includes(searchTerm.toLowerCase())), [books, searchTerm]);
  const pendingBooks = books.filter((book) => book.status === "pending");
  const publishedBooks = books.filter((book) => book.status === "published");
  const currentNav = NAV.find((item) => item.id === activeTab);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className={`topbar ${mobileMenu ? "mobile-menu-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")} aria-label="Literacy Verse home">
          <span className="brand-mark"><BookOpen size={23} strokeWidth={2.1} /><span className="brand-spark">✦</span></span>
          <span className="brand-words"><strong>literacy<span>verse</span></strong><small>LEARN · SHARE · GROW</small></span>
        </button>
        <nav className={`nav-links ${mobileMenu ? "nav-open" : ""}`} aria-label="Main navigation">
          {NAV.map(({ id, key, icon: Icon }) => <button key={id} className={`nav-link ${activeTab === id ? "nav-active" : ""}`} onClick={() => navigate(id)}><Icon size={16} /><span>{t(language, key)}</span>{id === "fund" && !isSignedIn ? <span className="nav-lock">•</span> : null}</button>)}
          {isAdmin && <button className={`nav-link ${activeTab === "admin" ? "nav-active" : ""}`} onClick={() => navigate("admin")}><ShieldCheck size={16} /><span>{t(language, "admin")}</span></button>}
        </nav>
        <div className="top-actions">
          <label className="language-select" aria-label="Choose language"><Languages size={16} /><select value={language} onChange={(event) => changeLanguage(event.target.value)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{item.code.toUpperCase()}</option>)}</select><ChevronDown size={13} /></label>
          {isSignedIn ? <button className="profile-pill" onClick={() => notify(`${displayName} · ${role || "visitor"}${isSupabaseConfigured ? "" : " · demo mode"}`)}><span className="avatar">{(displayName || "L").slice(0, 1).toUpperCase()}</span><span className="profile-name">{displayName}</span><ChevronDown size={14} /></button> : <button className="button button-dark button-small" onClick={() => openAuth("signin")}><LogIn size={15} />{t(language, "signIn")}</button>}
          {isSignedIn && <button className="icon-button signout-button" onClick={signOut} aria-label={t(language, "signOut")} title={t(language, "signOut")}><LogOut size={16} /></button>}
          <button className="mobile-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label={t(language, "navMenu")}>{mobileMenu ? <X /> : <Menu />}</button>
        </div>
      </header>

      {!isSupabaseConfigured && <div className="demo-strip"><Sparkles size={15} /><span><strong>{t(language, "demoMode")}:</strong> {t(language, "demoNote")}</span><button onClick={() => openAuth("signup")}>Set up account <ArrowRight size={14} /></button></div>}
      {notice && <div className={`notice notice-${noticeKind}`} role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}

      {activeTab === "home" && <>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />{t(language, "heroEyebrow")}</div>
            <h1>{t(language, "heroTitle").split("\n").map((line, index) => <span key={index}>{line}{index === 0 ? <br /> : null}</span>)}</h1>
            <p className="hero-lede">{t(language, "heroText")}</p>
            <div className="hero-buttons"><button className="button button-primary" onClick={() => navigate("library")}>{t(language, "exploreLibrary")} <ArrowRight size={17} /></button><button className="button button-quiet" onClick={() => navigate("ai")}><span className="play-dot"><Play size={13} fill="currentColor" /></span>{t(language, "meetTutor")}</button></div>
            <div className="hero-proof"><div className="avatar-stack"><span>A</span><span>文</span><span>අ</span><span>ع</span></div><div><strong>{t(language, "activeLearners")}</strong><small>Books · AI Tutor · Community</small></div><div className="proof-divider" /><div className="proof-globe"><Globe2 size={20} /></div><div><strong>Open to everyone</strong><small>Made for curious learners</small></div></div>
          </div>
          <div className="hero-art" aria-label="Illustration of an open book and learning ideas">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun" /><div className="art-star star-a">✦</div><div className="art-star star-b">✧</div><div className="art-star star-c">✦</div>
            <div className="art-note note-left"><span className="note-icon coral"><AudioLines size={18} /></span><span><b>Listen & learn</b><small>Ideas that travel</small></span></div>
            <div className="art-note note-right"><span className="note-icon mint"><Sparkles size={18} /></span><span><b>Ask anything</b><small>Grow your curiosity</small></span></div>
            <div className="book-illustration"><div className="book-left"><span className="book-line line-a"/><span className="book-line line-b"/><span className="book-line line-c"/><span className="leaf-shape">❧</span></div><div className="book-right"><span className="book-title-mark">READ<br />DREAM<br />DISCOVER</span><span className="book-line line-d"/><span className="book-line line-e"/><span className="book-flower">✳</span></div><div className="book-spine"/></div>
            <div className="art-caption"><span className="caption-dot"/><span>One world. Many ways to learn.</span></div>
          </div>
        </section>

        <section className="stats-row">
          <div className="stat-item"><span className="stat-icon stat-purple"><BookMarked size={18} /></span><div><strong>{publishedBooks.length.toString().padStart(2, "0")}+</strong><small>{t(language, "learningResources")}</small></div></div>
          <div className="stat-item"><span className="stat-icon stat-orange"><AudioLines size={18} /></span><div><strong>{podcasts.length.toString().padStart(2, "0")}+</strong><small>{t(language, "communityStories")}</small></div></div>
          <div className="stat-item"><span className="stat-icon stat-green"><Globe2 size={18} /></span><div><strong>{languageOptions.length.toString().padStart(2, "0")}+</strong><small>{t(language, "languages")}</small></div></div>
          <div className="stat-item stat-note"><span className="stat-spark">✳</span><div><strong>Learn at your pace.</strong><small>Small steps make big changes.</small></div></div>
        </section>

        <section className="section-block section-gap">
          <div className="section-heading"><div><span className="section-kicker">A LITTLE INSPIRATION</span><h2>{t(language, "trending")}</h2><p>Thoughtful resources to spark your next question.</p></div><button className="text-link" onClick={() => navigate("library")}>{t(language, "seeAll")} <ArrowRight size={15} /></button></div>
          <div className="resource-grid">
            {publishedBooks.slice(0, 3).map((book, index) => {
              const Icon = getBookIcon(book.resource_type);
              return <article className={`resource-card resource-card-${index % 3}`} key={book.id}>
                <div className={`resource-cover cover-${index % 3}`}><span className="cover-index">0{index + 1}</span><Icon size={37} strokeWidth={1.35} /><span className="cover-lines"/><span className="cover-orb"/></div>
                <div className="resource-card-content"><div className="card-meta"><span>{prettyType(book.resource_type, language)}</span><span className="new-label">{book.created_at && Date.now() - new Date(book.created_at).getTime() < 3 * 86400000 ? t(language, "latest") : "COMMUNITY PICK"}</span></div><h3>{book.title}</h3><p>{book.description}</p><div className="resource-footer"><span className="author-chip"><span className="mini-avatar">{(book.author || "L").slice(0,1).toUpperCase()}</span>{book.author || "Literacy Verse"}</span><button className="round-arrow" onClick={() => downloadBook(book)} aria-label={`${t(language, "readMore")}: ${book.title}`}><ArrowDownRight size={17} /></button></div></div>
              </article>;
            })}
          </div>
        </section>

        <section className="podcast-banner section-gap">
          <div className="podcast-banner-text"><span className="section-kicker light-kicker">LISTEN · REFLECT · GROW</span><h2>{t(language, "listenLearn")}<br /><em>one conversation at a time.</em></h2><p>Ideas become more powerful when we share them. Discover videos and conversations from our learning community.</p><button className="button button-white" onClick={() => navigate("podcasts")}>Explore podcasts <ArrowRight size={16} /></button></div>
          <div className="podcast-art"><div className="podcast-ring ring-one"/><div className="podcast-ring ring-two"/><div className="podcast-disc"><div className="disc-inner"><AudioLines size={47} strokeWidth={1.25}/></div></div><div className="podcast-label label-top">AUDIO STORIES</div><div className="podcast-label label-bottom">YOUR NEXT IDEA STARTS HERE</div><div className="podcast-small-dot"/></div>
        </section>

        <section className="mission-card section-gap"><div className="mission-mark"><HeartHandshake size={30} /></div><div className="mission-copy"><span className="section-kicker">A COMMUNITY WITH PURPOSE</span><h2>{t(language, "joinMission")}</h2><p>{t(language, "joinText")}</p></div><button className="button button-dark" onClick={() => navigate("about")}>{t(language, "learnMore")} <ArrowRight size={16} /></button></section>
      </>}

      {activeTab === "ai" && <section className="workspace-page">
        <div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot" />PERSONALISED LEARNING</div><h1>{t(language, "ai")}<span className="heading-period">.</span></h1><p>Ask questions, explore ideas, and understand difficult topics one step at a time.</p></div>
        <div className="tutor-layout"><aside className="tutor-sidebar"><div className="tutor-avatar-large"><Sparkles size={31} /></div><h3>Verse Tutor</h3><span className="online-status"><i/> Ready to help</span><p>{t(language, "responseHint")}</p><div className="tutor-tip"><strong><Sprout size={15}/> Try asking</strong><button onClick={() => setChatInput("Explain photosynthesis with a simple example.")}>Explain a science topic</button><button onClick={() => setChatInput("Help me make a study plan for this week.")}>Create a study plan</button><button onClick={() => setChatInput("Help me practise English with a short conversation.")}>Practise a language</button><button onClick={() => setChatInput("Explain this idea in simple steps and give one example.")}>Break down a difficult idea</button></div><div className="tutor-language"><Languages size={16}/><span>Replies in <strong>{languageOptions.find(item => item.code === language)?.label || "English"}</strong></span></div></aside>
          <div className="chat-panel"><div className="chat-header"><div><strong>Your learning conversation</strong><span>Private to this browser session · clear the chat anytime</span></div><button className="button button-quiet button-small" onClick={() => setChatMessages([])}>Clear chat</button></div><div className="chat-stream">
            {chatMessages.length === 0 ? <div className="chat-welcome"><div className="chat-welcome-icon"><MessageCircle size={28}/></div><h2>{t(language, "howCanHelp")}</h2><p>There are no silly questions here. Start with what you know, and we’ll work forward together.</p><div className="suggestion-row"><button onClick={() => setChatInput("Can you explain a difficult concept in simple words?")}>Explain a concept <ArrowRight size={13}/></button><button onClick={() => setChatInput("Can you help me plan my studies?")}>Plan my studies <ArrowRight size={13}/></button></div></div> : chatMessages.map((message, index) => <div className={`chat-message ${message.role === "user" ? "message-user" : "message-assistant"}`} key={`${index}-${message.role}`}><div className="message-avatar">{message.role === "user" ? <UserRound size={15}/> : <Sparkles size={15}/>}</div><div className="message-bubble"><span className="message-label">{message.role === "user" ? (displayName || "You") : "Verse Tutor"}</span><p>{message.content}</p>{message.demo && <small>Preview reply · add an AI API key for live answers</small>}</div></div>)}
            {chatBusy && <div className="chat-message message-assistant"><div className="message-avatar"><Sparkles size={15}/></div><div className="message-bubble"><span className="message-label">Verse Tutor</span><div className="typing-dots"><i/><i/><i/></div></div></div>}<div ref={chatEndRef}/>
          </div><form className="chat-composer" onSubmit={askTutor}><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={t(language, "askPlaceholder")} rows={2} maxLength={4000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); (event.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} /><div className="composer-bottom"><span><Sparkles size={14}/> Learning support, not a replacement for a teacher.</span><button className="button button-primary button-small" type="submit" disabled={chatBusy || !chatInput.trim()}>{t(language, "send")} <Send size={14}/></button></div></form></div></div>
        <p className="ai-disclaimer"><ShieldCheck size={15}/>{t(language, "aiNote")}</p>
      </section>}

      {activeTab === "library" && <section className="workspace-page">
        <div className="page-intro page-intro-row"><div><div className="eyebrow"><span className="eyebrow-dot"/>READ · CREATE · SHARE</div><h1>{t(language, "library")}<span className="heading-period">.</span></h1><p>Discover stories, study notes, poems, and PDF books shared for learning.</p></div><button className="button button-primary" onClick={() => isSignedIn ? setResourceModal(true) : openAuth("signin")}><Plus size={17}/>{t(language, "newResource")}</button></div>
        <div className="library-toolbar"><label className="search-field"><Search size={17}/><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by title, author, or topic…"/></label><div className="library-count"><BookOpen size={16}/><strong>{filteredBooks.length}</strong> resources</div></div>
        {isTeacher && <div className="teacher-notice"><NotebookPen size={18}/><span><strong>Teacher workspace</strong> — you can create stories, poems, notes, and submit PDF resources for review.</span><button onClick={() => setResourceModal(true)}>Create <ArrowRight size={14}/></button></div>}
        {filteredBooks.length ? <div className="library-grid">{filteredBooks.map((book, index) => { const Icon = getBookIcon(book.resource_type); return <article className="library-card" key={book.id}><div className={`library-card-art library-art-${index % 4}`}><span className="library-type">{prettyType(book.resource_type, language)}</span><Icon size={38} strokeWidth={1.45}/><span className="library-art-mark">{index % 2 ? "✳" : "✦"}</span></div><div className="library-card-body"><div className="resource-date">{book.created_at ? new Date(book.created_at).toLocaleDateString() : "Community"}{book.is_featured && <span> · Featured</span>}</div><h3>{book.title}</h3><p>{book.description || "A resource shared by the Literacy Verse community."}</p><div className="resource-footer"><span className="author-chip"><span className="mini-avatar">{(book.author || "L").slice(0,1).toUpperCase()}</span>{book.author || "Community"}</span><button className="text-link" onClick={() => downloadBook(book)}>{book.file_path ? t(language, "download") : t(language, "readMore")} <ArrowRight size={14}/></button></div></div></article>; })}</div> : <div className="empty-state"><Library size={32}/><h3>{t(language, "noResources")}</h3><p>Try another search or share a resource with the community.</p><button className="button button-primary" onClick={() => isSignedIn ? setResourceModal(true) : openAuth("signin")}><Plus size={16}/>{t(language, "newResource")}</button></div>}
        <div className="library-submit-strip"><div className="submit-icon"><UploadCloud size={25}/></div><div><strong>Have a book to share?</strong><p>Submit a PDF for review. Approved resources become available in the public library.</p></div><button className="button button-dark" onClick={() => isSignedIn ? setResourceModal(true) : openAuth("signin")}>{t(language, "shareBook")} <ArrowRight size={15}/></button></div>
      </section>}

      {activeTab === "podcasts" && <section className="workspace-page">
        <div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot"/>WATCH · LISTEN · DISCOVER</div><h1>{t(language, "podcasts")}<span className="heading-period">.</span></h1><p>Learning is a conversation. Watch community playlists and thoughtful learning videos.</p></div>
        {podcasts.length ? <div className="podcast-grid">{podcasts.map((podcast, index) => { const embed = youtubeEmbedUrl(podcast.video_url || ""); return <article className="podcast-card" key={podcast.id}><div className="video-frame">{embed ? <iframe src={embed} title={podcast.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="video-link-preview"><Youtube size={40}/><span>{podcast.video_url ? "Video link" : "Preview placeholder"}</span>{podcast.video_url ? <a href={podcast.video_url} target="_blank" rel="noreferrer">Open video <ArrowRight size={13}/></a> : <small>Admin adds the official video URL</small>}</div>}<span className="video-number">EP. {String(index + 1).padStart(2, "0")}</span></div><div className="podcast-card-content"><span className="section-kicker">LITERACY VERSE · COMMUNITY</span><h3>{podcast.title}</h3><p>{podcast.description || "A learning conversation from our community."}</p><div className="podcast-card-footer"><span><Play size={13} fill="currentColor"/> Watch & reflect</span><span>{podcast.created_at ? new Date(podcast.created_at).toLocaleDateString() : "New"}</span></div></div></article>; })}</div> : <div className="empty-state"><AudioLines size={32}/><h3>{t(language, "noPodcast")}</h3><p>Published podcast videos will appear here.</p></div>}
        <div className="podcast-guideline"><div className="podcast-guideline-icon"><Youtube size={23}/></div><div><strong>Sharing video is simple</strong><p>Administrators can publish a YouTube link. The video will be embedded here for visitors to watch.</p></div>{isAdmin && <button className="button button-primary" onClick={() => navigate("admin")}>Open admin studio <ArrowRight size={14}/></button>}</div>
      </section>}

      {activeTab === "fund" && <section className="workspace-page">
        <div className="fund-hero"><div className="fund-hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/>GIVE A LITTLE · CHANGE A LOT</div><h1>{t(language, "fundraisingTitle")}</h1><p>Help make reading materials, learning opportunities, and community-led literacy projects more accessible.</p><div className="fund-hero-tags"><span><HeartHandshake size={14}/> Community powered</span><span><ShieldCheck size={14}/> Transparent intentions</span></div></div><div className="fund-illustration"><div className="fund-coin coin-one">✳</div><div className="fund-coin coin-two">♡</div><div className="fund-book-stack"><span/><span/><span/><div className="fund-heart">♥</div></div><div className="fund-plant">❧</div></div></div>
        {!isSignedIn ? <div className="access-gate"><div className="gate-icon"><ShieldCheck size={29}/></div><h2>Sign in to access fundraising</h2><p>The fundraising page is public to discover, but actions and supporter tools require an account. This protects participant details and pledge records.</p><button className="button button-primary" onClick={() => openAuth("signin")}>{t(language, "signIn")} <ArrowRight size={16}/></button><button className="text-link" onClick={() => openAuth("signup")}>{t(language, "createAccount")}</button></div> : <><div className="fund-intro-row"><div><h2>Projects that bring learning closer</h2><p>Choose a campaign to see its purpose and record a pledge.</p></div>{canVolunteer && <span className="volunteer-badge"><HeartHandshake size={15}/> Volunteer access</span>}</div><div className="campaign-grid">{campaigns.map((campaign, index) => { const progress = Math.min(100, Math.round((Number(campaign.raised_amount || 0) / Math.max(1, Number(campaign.goal_amount || 1))) * 100)); return <article className="campaign-card" key={campaign.id}><div className={`campaign-art campaign-art-${index % 2}`}><span className="campaign-category">{campaign.category || "Community campaign"}</span><div className="campaign-illustration"><div className="campaign-sun"/><div className="campaign-book-shapes"><span/><span/><span/></div><HeartHandshake size={28}/></div></div><div className="campaign-content"><h3>{campaign.title}</h3><p>{campaign.description}</p><div className="campaign-amounts"><div><strong>{campaign.currency || "USD"} {Number(campaign.raised_amount || 0).toLocaleString()}</strong><small>{t(language, "raised")}</small></div><span>{t(language, "goal")}: {campaign.currency || "USD"} {Number(campaign.goal_amount || 0).toLocaleString()}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><div className="campaign-bottom"><span>{progress}% of goal</span><button className="button button-primary button-small" onClick={() => setPledgeCampaign(campaign)}>{t(language, "pledge")} <ArrowRight size={14}/></button></div></div></article>; })}</div><div className="payment-prototype-note"><ShieldCheck size={17}/><span>{t(language, "prototypeNotice")} A real payment provider must be integrated and tested before launching public fundraising.</span></div></>}
      </section>}

      {activeTab === "about" && <section className="workspace-page about-page"><div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot"/>OUR PURPOSE</div><h1>{t(language, "aboutTitle")}</h1><p>{t(language, "aboutText")}</p></div><div className="about-values-grid"><article><div className="value-icon value-purple"><BookOpen size={22}/></div><span>01 / READ</span><h3>Knowledge should travel.</h3><p>A reviewed e-library for books, stories, poems, and notes that help learners discover more.</p></article><article><div className="value-icon value-green"><Sparkles size={22}/></div><span>02 / LEARN</span><h3>Questions deserve care.</h3><p>An AI tutor designed to explain ideas patiently and adapt its language to the learner.</p></article><article><div className="value-icon value-orange"><AudioLines size={22}/></div><span>03 / SHARE</span><h3>Every voice has a place.</h3><p>Podcasts and community resources connect people through ideas and lived experiences.</p></article><article><div className="value-icon value-pink"><HeartHandshake size={22}/></div><span>04 / SUPPORT</span><h3>Literacy grows together.</h3><p>Volunteers and supporters can help community-led literacy initiatives reach more people.</p></article></div><div className="about-bottom"><div className="about-bottom-symbol">✳</div><div><h2>Build a habit. Open a world.</h2><p>Start with a page, a question, or a conversation. Your learning journey belongs to you.</p></div><button className="button button-dark" onClick={() => navigate("library")}>Start exploring <ArrowRight size={15}/></button></div></section>}

      {activeTab === "admin" && isAdmin && <section className="workspace-page admin-page"><div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot"/>CONTROLLED PUBLISHING</div><h1>{t(language, "admin")}<span className="heading-period">.</span></h1><p>{t(language, "adminDashboard")}</p></div><div className="admin-stat-row"><div><span>Pending resources</span><strong>{pendingBooks.length}</strong></div><div><span>Published resources</span><strong>{publishedBooks.length}</strong></div><div><span>Published podcasts</span><strong>{podcasts.length}</strong></div></div><div className="admin-columns"><section className="admin-panel"><div className="admin-panel-heading"><div><span className="section-kicker">CONTENT REVIEW</span><h2>Resource submissions</h2></div><span className="count-pill">{pendingBooks.length} pending</span></div>{pendingBooks.length ? pendingBooks.map((book) => <article className="pending-item" key={book.id}><div className="pending-icon"><BookOpen size={20}/></div><div className="pending-details"><strong>{book.title}</strong><p>{book.description || "No description provided."}</p><small>{book.author} · {prettyType(book.resource_type, language)}</small></div><div className="pending-actions"><button className="approve-button" onClick={() => updateBookStatus(book, "published")}><Check size={14}/>{t(language, "approve")}</button><button className="reject-button" onClick={() => updateBookStatus(book, "rejected")}>Reject</button></div></article>) : <div className="empty-inline"><Check size={19}/>No pending resources right now.</div>}</section><section className="admin-panel"><div className="admin-panel-heading"><div><span className="section-kicker">VIDEO LIBRARY</span><h2>{t(language, "addPodcast")}</h2></div><span className="admin-icon"><Youtube size={20}/></span></div><form className="form-stack" onSubmit={addPodcast}><label>{t(language, "title")}<input value={podcastTitle} onChange={(event) => setPodcastTitle(event.target.value)} required placeholder="e.g. Why stories matter"/></label><label>{t(language, "description")}<textarea value={podcastDescription} onChange={(event) => setPodcastDescription(event.target.value)} rows={3} placeholder="What will viewers learn?"/></label><label>{t(language, "videoUrl")}<input value={podcastUrl} onChange={(event) => setPodcastUrl(event.target.value)} required type="url" placeholder="https://www.youtube.com/watch?v=…"/></label><button className="button button-primary" type="submit" disabled={podcastBusy}>{podcastBusy ? t(language, "loading") : t(language, "add")} <ArrowRight size={15}/></button></form><div className="admin-security-note"><ShieldCheck size={15}/>Only a user whose database role is <code>admin</code> can publish content.</div></section></div></section>}

      <footer className="site-footer"><div className="footer-brand"><span className="brand-mark footer-mark"><BookOpen size={19}/><span className="brand-spark">✦</span></span><div><strong>literacy<span>verse</span></strong><small>{t(language, "footer")}</small></div></div><div className="footer-links"><button onClick={() => navigate("about")}>{t(language, "about")}</button><button onClick={() => navigate("library")}>{t(language, "library")}</button><button onClick={() => navigate("podcasts")}>{t(language, "podcasts")}</button><button onClick={() => setLanguageModal(true)}>{t(language, "chooseLanguage")}</button></div><div className="footer-copy">© {new Date().getFullYear()} Literacy Verse <span>Made for learning, everywhere.</span></div></footer>

      {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19}/></button><div className="modal-brand-mark"><BookOpen size={25}/></div><span className="section-kicker">WELCOME TO LITERACY VERSE</span><h2 id="auth-title">{authMode === "signin" ? t(language, "welcomeBack") : t(language, "createAccount")}</h2><p>Join a global community of readers, learners, educators, and volunteers.</p><div className="auth-mode-switch"><button className={authMode === "signin" ? "mode-selected" : ""} onClick={() => setAuthMode("signin")}>{t(language, "signIn")}</button><button className={authMode === "signup" ? "mode-selected" : ""} onClick={() => setAuthMode("signup")}>{t(language, "createAccount")}</button></div><form className="form-stack" onSubmit={handleAuth}>{authMode === "signup" && <><label>{t(language, "name")}<input value={authName} onChange={(event) => setAuthName(event.target.value)} required placeholder="Your display name"/></label><label>{t(language, "role")}<select value={authRole} onChange={(event) => setAuthRole(event.target.value as any)}><option value="student">{t(language, "student")}</option><option value="teacher">{t(language, "teacher")}</option><option value="volunteer">{t(language, "volunteer")}</option></select></label></>}<label>{t(language, "email")}<input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} type="email" required autoComplete="email" placeholder="you@example.com"/></label><label>{t(language, "password")}<input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} type="password" required minLength={6} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="At least 6 characters"/></label><button className="button button-primary button-full" type="submit" disabled={authBusy}>{authBusy ? t(language, "loading") : authMode === "signin" ? t(language, "signIn") : t(language, "createAccount")} <ArrowRight size={16}/></button></form>{!isSupabaseConfigured && <div className="demo-login-note"><Sparkles size={15}/><span>Preview mode: this creates a temporary demo session in this browser only. It is not a secure user account.</span></div>}<div className="auth-bottom-note"><ShieldCheck size={15}/>Your credentials are never shown publicly. Never share your password.</div></section></div>}

      {resourceModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourceModal(false); }}><section className="content-modal" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title"><button className="modal-close" onClick={() => setResourceModal(false)} aria-label="Close"><X size={19}/></button><div className="modal-brand-mark"><UploadCloud size={25}/></div><span className="section-kicker">COMMUNITY KNOWLEDGE</span><h2 id="resource-modal-title">{t(language, "newResource")}</h2><p>Submissions are reviewed by an administrator before they appear in the public library.</p><form className="form-stack" onSubmit={submitResource}><label>{t(language, "type")}<select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)}><option value="pdf">{t(language, "pdf")}</option>{isTeacher && <><option value="story">{t(language, "story")}</option><option value="poem">{t(language, "poem")}</option><option value="note">{t(language, "note")}</option></>}</select></label><label>{t(language, "title")}<input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} required placeholder="Resource title"/></label><label>{t(language, "author")}<input value={resourceAuthor} onChange={(event) => setResourceAuthor(event.target.value)} placeholder={displayName || "Your name"}/></label><label>{t(language, "description")}<textarea value={resourceDescription} onChange={(event) => setResourceDescription(event.target.value)} rows={2} placeholder="What is this resource about?"/></label>{resourceType === "pdf" && <label>PDF file (max 15 MB)<input type="file" accept="application/pdf,.pdf" onChange={(event) => setResourceFile(event.target.files?.[0] || null)}/></label>}{resourceType !== "pdf" && <label>Learning content<textarea value={resourceBody} onChange={(event) => setResourceBody(event.target.value)} rows={5} required placeholder="Write a story, poem, or note…"/></label>}{resourceType === "pdf" && <label>Optional text excerpt<textarea value={resourceBody} onChange={(event) => setResourceBody(event.target.value)} rows={2} placeholder="Add a short excerpt (optional)"/></label>}<div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setResourceModal(false)}>{t(language, "cancel")}</button><button className="button button-primary" type="submit" disabled={resourceBusy}>{resourceBusy ? t(language, "loading") : t(language, "publish")} <ArrowRight size={15}/></button></div></form></section></div>}

      {pledgeCampaign && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPledgeCampaign(null); }}><section className="auth-modal pledge-modal" role="dialog" aria-modal="true" aria-labelledby="pledge-title"><button className="modal-close" onClick={() => setPledgeCampaign(null)} aria-label="Close"><X size={19}/></button><div className="modal-brand-mark pledge-mark"><HeartHandshake size={25}/></div><span className="section-kicker">COMMUNITY SUPPORT</span><h2 id="pledge-title">{t(language, "pledge")}</h2><p><strong>{pledgeCampaign.title}</strong><br/>{pledgeCampaign.description}</p><form className="form-stack" onSubmit={recordPledge}><label>{t(language, "amount")}<input type="number" min="1" max="1000000" step="1" value={pledgeAmount} onChange={(event) => setPledgeAmount(event.target.value)} required/></label><div className="prototype-warning"><ShieldCheck size={16}/><span>{t(language, "prototypeNotice")}</span></div><div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setPledgeCampaign(null)}>{t(language, "cancel")}</button><button className="button button-primary" type="submit" disabled={pledgeBusy}>{pledgeBusy ? t(language, "loading") : t(language, "donate")} <ArrowRight size={15}/></button></div></form></section></div>}

      {activeBook && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveBook(null); }}><section className="reader-modal" role="dialog" aria-modal="true" aria-labelledby="reader-title"><button className="modal-close" onClick={() => setActiveBook(null)} aria-label="Close"><X size={19}/></button><span className="section-kicker">LITERACY VERSE READER</span><h2 id="reader-title">{activeBook.title}</h2><p className="reader-byline">By {activeBook.author || "Literacy Verse Community"}</p><div className="reader-body">{activeBook.body}</div><button className="button button-dark" onClick={() => setActiveBook(null)}>Close reader</button></section></div>}

      {languageModal && <div className="modal-backdrop language-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLanguageModal(false); }}><section className="language-modal" role="dialog" aria-modal="true" aria-labelledby="language-title"><button className="modal-close" onClick={() => setLanguageModal(false)} aria-label="Close"><X size={19}/></button><div className="modal-brand-mark"><Globe2 size={25}/></div><span className="section-kicker">A WORLD OF LEARNING</span><h2 id="language-title">{t(language, "chooseLanguage")}</h2><p>{t(language, "languageHelp")}</p><div className="language-choice-grid">{languageOptions.map((item) => <button key={item.code} className={language === item.code ? "language-choice selected" : "language-choice"} onClick={() => changeLanguage(item.code)}><span>{item.label}</span>{language === item.code && <Check size={15}/>}</button>)}</div><small className="language-modal-foot">Interface translations are currently provided for English, Sinhala, and Tamil. The AI Tutor can respond in the selected language when AI is enabled.</small></section></div>}
    </main>
  );
}
