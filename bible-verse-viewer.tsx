"use client"

import { useState, useEffect } from "react"
import { Settings, Clock, BookOpen, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { AutoSizedVerse } from "./components/AutoSizedVerse";

const TRANSLATIONS = [
  { label: "NASB 1995", value: "NASB1995", file: () => import("./src/app/NASB1995/NASB1995_bible.json") },
  { label: "NIV", value: "NIV", file: () => import("./src/app/NIV/NIV_bible.json") },
  { label: "NKJV", value: "NKJV", file: () => import("./src/app/NKJV/NKJV_bible.json") },
  { label: "NLT", value: "NLT", file: () => import("./src/app/NLT/NLT_bible.json") },
  { label: "RVR1960", value: "RVR1960", file: () => import("./src/app/RVR1960/RVR1960-Spanish.json") },
];





type BibleData = {
  [book: string]: {
    [chapter: string]: {
      [verse: string]: string;
    };
  };
};

export default function Component() {
  // Recent verses state (persisted in localStorage)
  const [recentVerses, setRecentVerses] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // Track the previous screen so we can return to it after closing history
  const [prevScreen, setPrevScreen] = useState<'main' | 'fullscreen' | null>(null);

  // Load recent verses from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentVerses');
    if (stored) setRecentVerses(JSON.parse(stored));
  }, []);

  // Save recent verses to localStorage when changed
  useEffect(() => {
    localStorage.setItem('recentVerses', JSON.stringify(recentVerses));
  }, [recentVerses]);

  // UI state
  const [textColor, setTextColor] = useState<string>('#1f2937');
  const [backgroundColor, setBackgroundColor] = useState<string>('#f3f4f6');
  const [fontSize, setFontSize] = useState<number[]>([72]);

  // On mount, sync UI state from localStorage (client only, only once)
  useEffect(() => {
    let didLoadSettings = false;
    if (!didLoadSettings && typeof window !== 'undefined') {
      const storedTextColor = localStorage.getItem('textColor');
      const storedBackgroundColor = localStorage.getItem('backgroundColor');
      const storedFontSize = localStorage.getItem('fontSize');
      if (storedTextColor) setTextColor(storedTextColor);
      if (storedBackgroundColor) setBackgroundColor(storedBackgroundColor);
      if (storedFontSize && !isNaN(Number(storedFontSize))) setFontSize([parseInt(storedFontSize, 10)]);
      didLoadSettings = true;
    }
  }, []);

  // Persist UI settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('textColor', textColor);
  }, [textColor]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('backgroundColor', backgroundColor);
  }, [backgroundColor]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('fontSize', String(fontSize[0]));
  }, [fontSize]);

  // Bible/verse state
  const [translation, setTranslation] = useState(TRANSLATIONS[0].value); // NASB1995 default
  const [bibleData, setBibleData] = useState<BibleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verse, setVerse] = useState("");

  // Search bar state
  const [searchInput, setSearchInput] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{book: string, chapter: string, verse: string, text: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fuzzy search and parse logic for search bar
  function handleVerseSearch(input: string) {
    if (!bibleData) return;
    // Parse input like "Matthew 2:10" or "Mathew 2:10"
    const match = input.match(/^([\w\s]+)\s+(\d+):(\d+)$/);
    if (!match) {
      // Optionally: show error to user
      return;
    }
    let inputBook = match[1].trim();
    const inputChapter = match[2];
    const inputVerse = match[3];
    // Fuzzy match book name
    let bestBook = books[0];
    let minDist = levenshtein(inputBook.toLowerCase(), bestBook.toLowerCase());
    for (const b of books) {
      const dist = levenshtein(inputBook.toLowerCase(), b.toLowerCase());
      if (dist < minDist) {
        minDist = dist;
        bestBook = b;
      }
    }
    
    // Validate that the verse exists before navigating
    if (!bibleData[bestBook] || 
        !bibleData[bestBook][inputChapter] || 
        !bibleData[bestBook][inputChapter][inputVerse]) {
      // Invalid verse - do not navigate
      return;
    }
    
    setBook(bestBook);
    setChapter(inputChapter);
    setVerse(inputVerse);
    setShowFull(true);
    setShowResults(false);
    // Add to recent verses (avoid duplicates, most recent first)
    const ref = `${bestBook} ${inputChapter}:${inputVerse}`;
    setRecentVerses(prev => [ref, ...prev.filter(v => v !== ref)].slice(0, 20));
  }

  // Handle search result selection
  function handleResultSelect(result: {book: string, chapter: string, verse: string, text: string}) {
    setBook(result.book);
    setChapter(result.chapter);
    setVerse(result.verse);
    setShowFull(true);
    setShowResults(false);
    setSearchInput("");
    // Add to recent verses
    const ref = `${result.book} ${result.chapter}:${result.verse}`;
    setRecentVerses(prev => [ref, ...prev.filter(v => v !== ref)].slice(0, 20));
  }

  // Levenshtein distance for fuzzy matching
  function levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  useEffect(() => {
    setLoading(true);
    const t = TRANSLATIONS.find(t => t.value === translation);
    if (t) {
      t.file().then(mod => {
        setBibleData(mod.default as BibleData);
        setBook("");
        setChapter("");
        setVerse("");
        setLoading(false);
      });
    }
  }, [translation]);

  const books = bibleData ? Object.keys(bibleData) : [];
  const chapters = book && bibleData && bibleData[book] ? Object.keys(bibleData[book]) : [];
  const verses = book && chapter && bibleData && bibleData[book] && bibleData[book][chapter] ? Object.keys(bibleData[book][chapter]) : [];
  const verseText = book && chapter && verse && bibleData && bibleData[book] && bibleData[book][chapter] && bibleData[book][chapter][verse] ? bibleData[book][chapter][verse] : "";

  // Keyboard navigation for verse view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showFull) return; // Only work in fullscreen mode
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        // Move to previous verse
        if (!bibleData || !book || !chapter || !verse) return;
        let vIdx = verses.indexOf(verse);
        let cIdx = chapters.indexOf(chapter);
        let bIdx = books.indexOf(book);
        if (vIdx > 0) {
          setVerse(verses[vIdx - 1]);
        } else if (cIdx > 0) {
          const prevChapter = chapters[cIdx - 1];
          const prevVerses = bibleData[book][prevChapter] ? Object.keys(bibleData[book][prevChapter]) : [];
          setChapter(prevChapter);
          setVerse(prevVerses[prevVerses.length - 1]);
        } else if (bIdx > 0) {
          const prevBook = books[bIdx - 1];
          const prevChapters = bibleData[prevBook] ? Object.keys(bibleData[prevBook]) : [];
          const lastChapter = prevChapters[prevChapters.length - 1];
          const lastVerses = bibleData[prevBook][lastChapter] ? Object.keys(bibleData[prevBook][lastChapter]) : [];
          setBook(prevBook);
          setChapter(lastChapter);
          setVerse(lastVerses[lastVerses.length - 1]);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        // Move to next verse
        if (!bibleData || !book || !chapter || !verse) return;
        let vIdx = verses.indexOf(verse);
        let cIdx = chapters.indexOf(chapter);
        let bIdx = books.indexOf(book);
        if (vIdx < verses.length - 1) {
          setVerse(verses[vIdx + 1]);
        } else if (cIdx < chapters.length - 1) {
          const nextChapter = chapters[cIdx + 1];
          const nextVerses = bibleData[book][nextChapter] ? Object.keys(bibleData[book][nextChapter]) : [];
          setChapter(nextChapter);
          setVerse(nextVerses[0]);
        } else if (bIdx < books.length - 1) {
          const nextBook = books[bIdx + 1];
          const nextChapters = bibleData[nextBook] ? Object.keys(bibleData[nextBook]) : [];
          const firstChapter = nextChapters[0];
          const firstVerses = bibleData[nextBook][firstChapter] ? Object.keys(bibleData[nextBook][firstChapter]) : [];
          setBook(nextBook);
          setChapter(firstChapter);
          setVerse(firstVerses[0]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFull, bibleData, book, chapter, verse, books, chapters, verses]);

  // Live search functionality with debouncing and fuzzy matching
  useEffect(() => {
    if (!bibleData || !searchInput.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    // Debounce the search to avoid constant refreshing
    const timeoutId = setTimeout(() => {
      const searchTerm = searchInput.toLowerCase().trim();
      const results: Array<{book: string, chapter: string, verse: string, text: string}> = [];

      // Check if it looks like a verse reference (e.g., "John 3:16" or "john 3:16")
      const verseReferenceMatch = searchTerm.match(/^(.+?)\s+(\d+):(\d+)$/);
      
      if (verseReferenceMatch) {
        // Handle verse reference search with fuzzy book matching
        const inputBook = verseReferenceMatch[1].trim();
        const inputChapter = verseReferenceMatch[2];
        const inputVerse = verseReferenceMatch[3];
        
        // Find best matching book using fuzzy search
        let bestBook = books[0];
        let minDist = levenshtein(inputBook, bestBook.toLowerCase());
        for (const bookName of books) {
          const dist = levenshtein(inputBook, bookName.toLowerCase());
          if (dist < minDist) {
            minDist = dist;
            bestBook = bookName;
          }
        }
        
        // Check if the verse exists
        if (bibleData[bestBook] && 
            bibleData[bestBook][inputChapter] && 
            bibleData[bestBook][inputChapter][inputVerse]) {
          results.push({
            book: bestBook,
            chapter: inputChapter,
            verse: inputVerse,
            text: bibleData[bestBook][inputChapter][inputVerse]
          });
        }
      } else {
        // Handle general text search through all verses
        for (const bookName of books) {
          if (results.length >= 5) break;
          
          const bookData = bibleData[bookName];
          for (const chapterNum of Object.keys(bookData)) {
            if (results.length >= 5) break;
            
            const chapterData = bookData[chapterNum];
            for (const verseNum of Object.keys(chapterData)) {
              if (results.length >= 5) break;
              
              const verseText = chapterData[verseNum];
              const reference = `${bookName} ${chapterNum}:${verseNum}`;
              
              // Check if search term matches reference, book name (with fuzzy), or verse text
              const bookMatches = levenshtein(searchTerm, bookName.toLowerCase()) <= 2; // Allow up to 2 character differences
              const referenceMatches = reference.toLowerCase().includes(searchTerm);
              const textMatches = verseText.toLowerCase().includes(searchTerm);
              
              if (bookMatches || referenceMatches || textMatches) {
                results.push({
                  book: bookName,
                  chapter: chapterNum,
                  verse: verseNum,
                  text: verseText
                });
              }
            }
          }
        }
      }

      setSearchResults(results);
      setIsSearching(false);
    }, 150); // debounce time

    // Cleanup timeout on dependency change
    return () => clearTimeout(timeoutId);
  }, [searchInput, bibleData]);

  const colorOptions = [
    { name: "Black", value: "#1f2937" },
    { name: "White", value: "#ffffff" },
    // Blue: Tailwind blue-600, vibrant and readable
    { name: "Blue", value: "#2563eb" },
    // Purple: Tailwind violet-600, rich and modern
    { name: "Purple", value: "#7c3aed" },
    // Green: Tailwind emerald-600, modern and readable
    { name: "Green", value: "#059669" },
    // Red: Tailwind rose-600, softer and more elegant than pure red
    { name: "Red", value: "#e11d48" },
  ]

  const backgroundOptions = [
    { name: "White", value: "#f3f4f6" },
    { name: "Black", value: "#000000" },
    { name: "Brown", value: "#271608" },
    { name: "Light Pink", value: "#fff3fd" },
    { name: "Light Purple", value: "#faf5ff" },
    { name: "Light Green", value: "#f0fdf4" },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* Header */}
      <header className="flex items-center justify-end p-4 gap-2">
        {/* Translation Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
              {TRANSLATIONS.find(t => t.value === translation)?.label}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            {TRANSLATIONS.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setTranslation(t.value)}
                className={translation === t.value ? "bg-purple-100" : ""}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Text Color</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <Button
                      key={color.name}
                      variant={textColor === color.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTextColor(color.value)}
                      className="justify-start"
                    >
                      <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color.value }} />
                      {color.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Background Color</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {backgroundOptions.map((bg) => (
                    <Button
                      key={bg.name}
                      variant={backgroundColor === bg.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBackgroundColor(bg.value)}
                      className="justify-start"
                    >
                      <div className="w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: bg.value }} />
                      {bg.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Font Size: {fontSize[0]}px</Label>
                <Slider value={fontSize} onValueChange={setFontSize} max={100} min={12} step={1} className="mt-2" />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-600 hover:text-gray-800"
          onClick={() => {
            setPrevScreen('main');
            setShowHistory(true);
          }}
          aria-label="Show recent verses"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 pt-16">
        {/* Bible Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-20 bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg shadow-lg relative">
            {/* Light rays */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-yellow-400 rounded-full transform -rotate-12"></div>
                <div className="w-1 h-5 bg-yellow-400 rounded-full"></div>
                <div className="w-1 h-4 bg-yellow-400 rounded-full transform rotate-12"></div>
              </div>
            </div>
            {/* Cross */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-1 h-8 bg-yellow-400 rounded-full"></div>
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-5 h-1 bg-yellow-400 rounded-full"></div>
              </div>
            </div>
            {/* Book pages effect */}
            <div className="absolute -right-1 top-1 w-24 h-18 bg-gray-200 rounded-r-lg -z-10"></div>
            <div className="absolute -right-2 top-2 w-24 h-16 bg-gray-300 rounded-r-lg -z-20"></div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold mb-12" style={{ color: textColor, fontSize: `${fontSize[0] + 8}px` }}>
          Bible Verse Viewer
        </h1>

        {/* Search Section */}
        <div className="w-full max-w-md mb-8">
          <div className="relative">
            {/* Single Search Bar for Book Chapter:Verse */}
            <form
              className="flex flex-col gap-2"
              onSubmit={e => {
                e.preventDefault();
                handleVerseSearch(searchInput);
              }}
            >
              <label className="font-semibold">Search for a verse</label>
              <input
                className="p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                type="text"
                placeholder="Type book name, chapter, and verse..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onBlur={() => {
                  // Delay hiding results to allow clicks
                  setTimeout(() => setShowResults(false), 200);
                }}
                onFocus={() => {
                  if (searchInput.trim()) setShowResults(true);
                }}
              />
              <Button type="submit" className="mt-2 w-fit">Go</Button>
            </form>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                {isSearching ? (
                  // Skeleton loading state
                  <div className="p-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 border-b border-gray-100 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  // No results
                  <div className="p-4 text-center text-gray-500">
                    No verses found matching "{searchInput}"
                  </div>
                ) : (
                  // Results
                  <div className="p-1">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.book}-${result.chapter}-${result.verse}`}
                        className="w-full text-left p-3 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                        onClick={() => handleResultSelect(result)}
                      >
                        <div className="font-medium text-purple-600 mb-1">
                          {result.book} {result.chapter}:{result.verse}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {result.text.length > 100 ? `${result.text.substring(0, 100)}...` : result.text}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* History Fullscreen Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full" style={{ background: backgroundColor, color: textColor }}>
          {/* Top bar with close button */}
          <div className="flex items-center justify-between w-full px-6 py-4 border-b border-gray-200" style={{ background: backgroundColor }}>
            <span className="font-semibold text-2xl" style={{ color: textColor }}>Recent Verses</span>
            <button
              className="text-gray-500 hover:text-gray-800 text-2xl px-3 py-1 rounded focus:outline-none"
              onClick={() => {
                setShowHistory(false);
                // Restore previous screen
                if (prevScreen === 'fullscreen') {
                  setShowFull(true);
                }
                // If prevScreen is 'main' or null, do nothing (main menu is default)
                setPrevScreen(null);
              }}
              aria-label="Close history"
              style={{ background: 'transparent' }}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 w-full flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
            <div className="w-full max-w-lg mx-auto mt-8 mb-8 bg-white/80 rounded-xl shadow-lg p-6" style={{ border: `1px solid ${backgroundColor === '#000000' ? '#333' : '#e5e7eb'}` }}>
              {recentVerses.length === 0 ? (
                <div className="text-gray-400 text-center py-12">No recent verses</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentVerses.map((ref, i) => (
                    <li key={ref}>
                      <button
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-purple-50 focus:bg-purple-100 focus:outline-none rounded transition"
                        style={{ color: textColor, fontWeight: 500, fontSize: 20, background: 'transparent' }}
                        onClick={() => {
                          const m = ref.match(/^(.*) (\d+):(\d+)$/);
                          if (!m) return;
                          const [_, b, c, v] = m;
                          setBook(b);
                          setChapter(c);
                          setVerse(v);
                          setPrevScreen('fullscreen');
                          setShowFull(true);
                          setShowHistory(false);
                        }}
                      >
                        <span>{ref}</span>
                        <span className="text-xs text-gray-400 ml-2">{i === 0 ? 'Most Recent' : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Footer - not affected by font size, minimal distance from bottom/right */}
          <footer className="fixed bottom-1 right-1 z-50">
            <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 12 }}>
              Made with <span className="text-red-500">❤️</span> by Dylan
            </p>
          </footer>
        </div>
      )}

        {/* Fullscreen Verse View */}
        {showFull && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-center min-h-screen w-full bg-black/80"
            style={{ background: backgroundColor, color: textColor }}
          >
            {/* Top bar: Bible icon, verse title, settings, clock (match main menu layout) */}
            <div className="flex items-center justify-end p-4 gap-2 w-full relative z-50 select-none" style={{ pointerEvents: 'auto' }}>
              {/* Bible Icon - top left, as button to exit fullscreen */}
              <div className="absolute left-0 top-0 flex items-center h-full pl-4" style={{ pointerEvents: 'auto' }}>
                <button
                  className="focus:outline-none flex items-center justify-center w-10 h-10 rounded-full bg-transparent hover:bg-black/10 transition"
                  aria-label="Back to main menu"
                  onClick={() => setShowFull(false)}
                  style={{ border: 'none', padding: 0 }}
                >
                  <div className="w-7 h-7 bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg shadow-lg relative flex items-center justify-center">
                    {/* Light rays */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                      <div className="flex space-x-0.5">
                        <div className="w-0.5 h-2 bg-yellow-400 rounded-full transform -rotate-12"></div>
                        <div className="w-0.5 h-2.5 bg-yellow-400 rounded-full"></div>
                        <div className="w-0.5 h-2 bg-yellow-400 rounded-full transform rotate-12"></div>
                      </div>
                    </div>
                    {/* Cross */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-0.5 h-3.5 bg-yellow-400 rounded-full mx-auto"></div>
                        <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-yellow-400 rounded-full"></div>
                      </div>
                    </div>
                    {/* Book pages effect */}
                    <div className="absolute -right-0.5 top-0.5 w-7 h-5 bg-gray-200 rounded-r-lg -z-10"></div>
                    <div className="absolute -right-1 top-1 w-7 h-4 bg-gray-300 rounded-r-lg -z-20"></div>
                  </div>
                </button>
              </div>
              {/* Centered Verse Title (centered with respect to the icons) */}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-center h-full pointer-events-none" style={{zIndex: 51}}>
                <div
                  className="font-bold text-center opacity-90"
                  style={{
                    fontSize: 36,
                    maxWidth: '80vw',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: 1.1,
                    padding: '0 1rem',
                  }}
                >
                  {book} {chapter}:{verse}
                </div>
              </div>
              {/* Settings and Clock - top right, match main menu */}
              <div className="flex flex-row items-center gap-2 ml-auto pr-0" style={{ pointerEvents: 'auto' }}>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">Text Color</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {colorOptions.map((color) => (
                            <Button
                              key={color.name}
                              variant={textColor === color.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTextColor(color.value)}
                              className="justify-start"
                            >
                              <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color.value }} />
                              {color.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Background Color</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {backgroundOptions.map((bg) => (
                            <Button
                              key={bg.name}
                              variant={backgroundColor === bg.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setBackgroundColor(bg.value)}
                              className="justify-start"
                            >
                              <div className="w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: bg.value }} />
                              {bg.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Font Size: {fontSize[0]}px</Label>
                        <Slider value={fontSize} onValueChange={setFontSize} max={100} min={12} step={1} className="mt-2" />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-gray-800"
                  onClick={() => {
                    setPrevScreen('fullscreen');
                    setShowHistory(true);
                    setShowFull(false);
                  }}
                  aria-label="Show recent verses"
                >
                  <Clock className="h-5 w-5" />
                </Button>
              </div>
            </div>
            {/* Centered verse text in scrollable area, top bar/title always fixed */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center" style={{
              paddingTop: '0px',
              paddingBottom: '30px',
              paddingLeft: '40px',
              paddingRight: '40px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}>
              <AutoSizedVerse
                text={verseText}
                fontSize={fontSize[0]}
                color={textColor}
              />
            </div>
            {/* Footer - not affected by font size, same margin as top bar */}
            {/* Footer - not affected by font size, minimal distance from bottom/right */}
            <footer className="fixed bottom-1 right-1 z-50">
              <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 12 }}>
                Made with <span className="text-red-500">❤️</span> by Dylan
              </p>
            </footer>

            {/* Left Arrow - only show if not at first verse of chapter */}
            {verses.indexOf(verse) > 0 && (
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 bg-transparent hover:bg-black/10 focus:outline-none"
                style={{ color: textColor, border: "none", marginLeft: 6, borderRadius: '50%' }}
                onClick={() => {
                  // Move to previous verse
                  if (!bibleData || !book || !chapter || !verse) return;
                  let vIdx = verses.indexOf(verse);
                  let cIdx = chapters.indexOf(chapter);
                  let bIdx = books.indexOf(book);
                  if (vIdx > 0) {
                    setVerse(verses[vIdx - 1]);
                  } else if (cIdx > 0) {
                    const prevChapter = chapters[cIdx - 1];
                    const prevVerses = bibleData[book][prevChapter] ? Object.keys(bibleData[book][prevChapter]) : [];
                    setChapter(prevChapter);
                    setVerse(prevVerses[prevVerses.length - 1]);
                  } else if (bIdx > 0) {
                    const prevBook = books[bIdx - 1];
                    const prevChapters = bibleData[prevBook] ? Object.keys(bibleData[prevBook]) : [];
                    const lastChapter = prevChapters[prevChapters.length - 1];
                    const lastVerses = bibleData[prevBook][lastChapter] ? Object.keys(bibleData[prevBook][lastChapter]) : [];
                    setBook(prevBook);
                    setChapter(lastChapter);
                    setVerse(lastVerses[lastVerses.length - 1]);
                  }
                }}
                aria-label="Previous Verse"
              >
                {/* Sleek left arrow icon only */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="18,7 10,14 18,21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {/* Right Arrow - only show if not at last verse of chapter */}
            {verses.indexOf(verse) < verses.length - 1 && (
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 bg-transparent hover:bg-black/10 focus:outline-none"
                style={{ color: textColor, border: "none", marginRight: 6, borderRadius: '50%' }}
                onClick={() => {
                  // Move to next verse
                  if (!bibleData || !book || !chapter || !verse) return;
                  let vIdx = verses.indexOf(verse);
                  let cIdx = chapters.indexOf(chapter);
                  let bIdx = books.indexOf(book);
                  if (vIdx < verses.length - 1) {
                    setVerse(verses[vIdx + 1]);
                  } else if (cIdx < chapters.length - 1) {
                    const nextChapter = chapters[cIdx + 1];
                    const nextVerses = bibleData[book][nextChapter] ? Object.keys(bibleData[book][nextChapter]) : [];
                    setChapter(nextChapter);
                    setVerse(nextVerses[0]);
                  } else if (bIdx < books.length - 1) {
                    const nextBook = books[bIdx + 1];
                    const nextChapters = bibleData[nextBook] ? Object.keys(bibleData[nextBook]) : [];
                    const firstChapter = nextChapters[0];
                    const firstVerses = bibleData[nextBook][firstChapter] ? Object.keys(bibleData[nextBook][firstChapter]) : [];
                    setBook(nextBook);
                    setChapter(firstChapter);
                    setVerse(firstVerses[0]);
                  }
                }}
                aria-label="Next Verse"
              >
                {/* Sleek right arrow icon only */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="10,7 18,14 10,21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer (main view) */}
      {/* Footer (main view) - minimal distance from bottom/right */}
      <footer className="fixed bottom-1 right-1 z-40">
        <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 12 }}>
          Made with <span className="text-red-500">❤️</span> by Dylan
        </p>
      </footer>
    </div>
  );
}

