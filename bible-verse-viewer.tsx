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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

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

  // Book navigation state
  const [showBookNavigation, setShowBookNavigation] = useState(false);
  const [navigationStep, setNavigationStep] = useState<'books' | 'chapters' | 'verses'>('books');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');

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
  const [fontFamily, setFontFamily] = useState<string>('Arial, Helvetica, sans-serif');
  const [showCredit, setShowCredit] = useState<boolean>(true);

  // On mount, sync UI state from localStorage (client only, only once)
  useEffect(() => {
    let didLoadSettings = false;
    if (!didLoadSettings && typeof window !== 'undefined') {
      const storedTextColor = localStorage.getItem('textColor');
      const storedBackgroundColor = localStorage.getItem('backgroundColor');
      const storedFontSize = localStorage.getItem('fontSize');
      const storedFontFamily = localStorage.getItem('fontFamily');
      const storedShowCredit = localStorage.getItem('showCredit');
      if (storedTextColor) setTextColor(storedTextColor);
      if (storedBackgroundColor) setBackgroundColor(storedBackgroundColor);
      if (storedFontSize && !isNaN(Number(storedFontSize))) setFontSize([parseInt(storedFontSize, 10)]);
      if (storedShowCredit !== null) setShowCredit(storedShowCredit === 'true');
      if (storedFontFamily) {
        // Check if the stored font family is still available
        const isValidFont = fontOptions.some(font => font.value === storedFontFamily);
        if (isValidFont) {
          setFontFamily(storedFontFamily);
        } else {
          // If the font is no longer available, reset to default
          setFontFamily('Arial, Helvetica, sans-serif');
          localStorage.setItem('fontFamily', 'Arial, Helvetica, sans-serif');
        }
      }
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
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('fontFamily', fontFamily);
  }, [fontFamily]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('showCredit', String(showCredit));
  }, [showCredit]);

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
    let bestBook = orderedBooks[0];
    let minDist = levenshtein(inputBook.toLowerCase(), bestBook.toLowerCase());
    for (const b of orderedBooks) {
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
    // Add to recent verses (avoid duplicates, most recent first)
    const ref = `${bestBook} ${inputChapter}:${inputVerse}`;
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

  // Protestant book order for RVR1960 translation
  const protestantBookOrder = [
    // Old Testament
    "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
    "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes",
    "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester",
    "Job", "Salmos", "Proverbios", "Eclesiastés", "Cantares",
    "Isaías", "Jeremías", "Lamentaciones", "Ezequiel", "Daniel",
    "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas",
    "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías",
    // New Testament
    "S. Mateo", "S. Marcos", "S. Lucas", "S.Juan",
    "Hechos", "Romanos", "1 Corintios", "2 Corintios", "Gálatas",
    "Efesios", "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses",
    "1 Timoteo", "2 Timoteo", "Tito", "Filemón", "Hebreos",
    "Santiago", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan",
    "Judas", "Apocalipsis"
  ];

  // Order books according to Protestant order for RVR1960, alphabetical for others
  const orderedBooks = translation === 'RVR1960' && bibleData ? 
    protestantBookOrder.filter(book => bibleData[book]) : 
    books;

  // For navigation: chapters and verses based on selected book/chapter
  const navigationChapters = selectedBook && bibleData && bibleData[selectedBook] ? Object.keys(bibleData[selectedBook]) : [];
  const navigationVerses = selectedBook && selectedChapter && bibleData && bibleData[selectedBook] && bibleData[selectedBook][selectedChapter] ? Object.keys(bibleData[selectedBook][selectedChapter]) : [];

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
        let bIdx = orderedBooks.indexOf(book);
        if (vIdx > 0) {
          setVerse(verses[vIdx - 1]);
        } else if (cIdx > 0) {
          const prevChapter = chapters[cIdx - 1];
          const prevVerses = bibleData[book][prevChapter] ? Object.keys(bibleData[book][prevChapter]) : [];
          setChapter(prevChapter);
          setVerse(prevVerses[prevVerses.length - 1]);
        } else if (bIdx > 0) {
          const prevBook = orderedBooks[bIdx - 1];
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
        let bIdx = orderedBooks.indexOf(book);
        if (vIdx < verses.length - 1) {
          setVerse(verses[vIdx + 1]);
        } else if (cIdx < chapters.length - 1) {
          const nextChapter = chapters[cIdx + 1];
          const nextVerses = bibleData[book][nextChapter] ? Object.keys(bibleData[book][nextChapter]) : [];
          setChapter(nextChapter);
          setVerse(nextVerses[0]);
        } else if (bIdx < orderedBooks.length - 1) {
          const nextBook = orderedBooks[bIdx + 1];
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
  }, [showFull, bibleData, book, chapter, verse, orderedBooks, chapters, verses]);

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

  const fontOptions = [
    { name: "Arial (Default)", value: "Arial, Helvetica, sans-serif" },
    { name: "Apoc Normal", value: "'Apoc Normal', serif" },
    { name: "Cascadia Mono", value: "'Cascadia Mono', monospace" },
    { name: "Chunk Five", value: "'Chunk Five', serif" },
    { name: "Circe Slab", value: "'Circe Slab', serif" },
    { name: "DIN Next Slab Pro", value: "'DIN Next Slab Pro', serif" },
    { name: "Fanwood", value: "'Fanwood', serif" },
    { name: "League Spartan", value: "'League Spartan', sans-serif" },
    { name: "Maru Chaba", value: "'Maru Chaba', serif" },
    { name: "Ougkeh", value: "'Ougkeh', serif" },
    { name: "Prociono", value: "'Prociono', serif" },
    { name: "Quicking", value: "'Quicking', serif" },
    { name: "Tagesschrift", value: "'Tagesschrift', serif" },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* Header */}
      <header className="flex items-center justify-end p-3 sm:p-4 gap-2">
        {/* Translation Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              style={{ color: textColor, fontFamily: fontFamily }} 
              className="hover:bg-transparent"
              onMouseEnter={(e) => {
                // Background hover logic
                if (backgroundColor === '#f3f4f6') {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                } else {
                  e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333333' : '#f3f4f6';
                }
                // Text hover logic - white text stays white
                if (textColor !== '#ffffff') {
                  e.currentTarget.style.color = '#374151'; // gray-700 for other colors
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = textColor; // restore original text color
              }}
            >
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
                style={{ fontFamily: fontFamily }}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              style={{ color: textColor }} 
              className="hover:bg-transparent"
              onMouseEnter={(e) => {
                // Background hover logic
                if (backgroundColor === '#f3f4f6') {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                } else {
                  e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333333' : '#f3f4f6';
                }
                // Text hover logic - white text stays white
                if (textColor !== '#ffffff') {
                  e.currentTarget.style.color = '#374151'; // gray-700 for other colors
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = textColor; // restore original text color
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: fontFamily }}>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Text Color</Label>
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
                      <span style={{ fontFamily: fontFamily }}>{color.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Background Color</Label>
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
                      <span style={{ fontFamily: fontFamily }}>{bg.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Font Size: {fontSize[0]}px</Label>
                <Slider value={fontSize} onValueChange={setFontSize} max={100} min={12} step={1} className="mt-2" />
              </div>

              <div>
                <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="mt-2" style={{ fontFamily: fontFamily }}>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="credit" checked={showCredit} onCheckedChange={(checked) => setShowCredit(checked === true)} />
                <Label htmlFor="credit" className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Credit</Label>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          style={{ color: textColor }}
          className="hover:bg-transparent"
          onMouseEnter={(e) => {
            // Background hover logic
            if (backgroundColor === '#f3f4f6') {
              e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
            } else {
              e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333333' : '#f3f4f6';
            }
            // Text hover logic - white text stays white
            if (textColor !== '#ffffff') {
              e.currentTarget.style.color = '#374151'; // gray-700 for other colors
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = textColor; // restore original text color
          }}
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
      <main className="flex flex-col items-center justify-center px-4 sm:px-6 pt-8 sm:pt-16">
        {/* Bible Icon */}
        <div className="relative mb-6 sm:mb-8">
          <div className="w-28 h-24 bg-gradient-to-b from-purple-800 to-purple-900 rounded-2xl shadow-lg relative">
            {/* Light rays */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-amber-300 rounded-full transform -rotate-12"></div>
                <div className="w-1 h-5 bg-amber-300 rounded-full"></div>
                <div className="w-1 h-4 bg-amber-300 rounded-full transform rotate-12"></div>
              </div>
            </div>
            {/* Cross */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Vertical bar with shadow for depth */}
                <div className="w-2 h-14 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 rounded-lg shadow-sm"></div>
                {/* Horizontal bar with shadow for depth - averaged length */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-10 h-2 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 rounded-lg shadow-sm"></div>
              </div>
            </div>
            {/* Book pages effect */}
            <div className="absolute -right-1 top-1 w-28 h-22 bg-gray-200 rounded-r-2xl -z-10"></div>
            <div className="absolute -right-2 top-2 w-28 h-20 bg-gray-300 rounded-r-2xl -z-20"></div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold mb-8 sm:mb-12 px-4 text-center" style={{ color: textColor, fontSize: `${Math.min(fontSize[0] + 8, 48)}px`, fontFamily: fontFamily, lineHeight: '1.2' }}>
          Bible Verse Viewer
        </h1>

        {/* Search Section */}
        <div className="w-full max-w-md mb-6 sm:mb-8 px-2">
          <div className="relative">
            {/* Single Search Bar for Book Chapter:Verse */}
            <form
              className="flex flex-col gap-2"
              onSubmit={e => {
                e.preventDefault();
                handleVerseSearch(searchInput);
              }}
            >
              <label className="font-semibold text-sm sm:text-base" style={{ color: textColor, fontFamily: fontFamily }}>Search for a verse</label>
              <div className="relative">
                <input
                  className="p-2 pr-12 rounded border border-gray-300 focus:outline-none focus:ring-2 w-full text-sm sm:text-base"
                  type="text"
                  placeholder="Type book name, chapter, and verse..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  style={{ 
                    fontFamily: fontFamily,
                    '--tw-ring-color': textColor,
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowBookNavigation(true);
                    setNavigationStep('books');
                    setSelectedBook('');
                    setSelectedChapter('');
                    setPrevScreen('main');
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                  style={{ color: textColor === '#ffffff' ? '#000000' : textColor }}
                  aria-label="Browse books"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                type="submit" 
                className="mt-2 w-fit text-sm border border-gray-300 focus:ring-2 focus:outline-none hover:bg-gray-50"
                style={{ 
                  color: textColor,
                  fontFamily: fontFamily,
                  backgroundColor: '#ffffff',
                  borderColor: '#d1d5db',
                  '--tw-ring-color': textColor,
                } as React.CSSProperties & { '--tw-ring-color': string }}
              >
                Go
              </Button>
            </form>
          </div>
        </div>

      {/* History Fullscreen Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full" style={{ background: backgroundColor, color: textColor }}>
          {/* Top bar with close button */}
          <div className="flex items-center justify-between w-full px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ background: backgroundColor }}>
            <span className="font-semibold text-lg sm:text-2xl" style={{ color: textColor, fontFamily: fontFamily }}>Recent Verses</span>
            <button
              className="text-gray-500 hover:text-gray-800 text-xl sm:text-2xl px-2 sm:px-3 py-1 rounded focus:outline-none"
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
            <div className="w-full max-w-lg mx-auto mt-4 mb-4 bg-white/80 rounded-xl shadow-lg p-3 sm:p-4 max-h-[80vh] overflow-y-auto" style={{ border: `1px solid ${backgroundColor === '#000000' ? '#333' : '#e5e7eb'}` }}>
              {recentVerses.length === 0 ? (
                <div className="text-gray-400 text-center py-12" style={{ fontFamily: fontFamily }}>No recent verses</div>
              ) : (
                <ul>
                  {recentVerses.map((ref, i) => (
                    <li key={ref}>
                      <button
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 hover:bg-purple-50 focus:bg-purple-100 focus:outline-none rounded transition"
                        style={{ color: textColor, fontWeight: 500, fontSize: 16, background: 'transparent', fontFamily: fontFamily, minHeight: '44px' }}
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
                        <span className="text-xs text-gray-400 ml-2" style={{ fontFamily: fontFamily }}>{i === 0 ? 'Most Recent' : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Footer - not affected by font size, minimal distance from bottom/right */}
          {showCredit && (
            <footer className="fixed bottom-1 right-1 z-50">
              <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 10 }}>
                Made with <span className="text-red-500">❤️</span> by Dylan
              </p>
            </footer>
          )}
        </div>
      )}

      {/* Book Navigation Fullscreen Overlay */}
      {showBookNavigation && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full" style={{ background: backgroundColor, color: textColor }}>
          {/* Top bar with navigation title and close button */}
          <div className="flex items-center justify-between w-full px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ background: backgroundColor }}>
            <div className="flex items-center gap-2 sm:gap-4">
              {navigationStep !== 'books' && (
                <button
                  className="text-gray-500 hover:text-gray-800 text-lg sm:text-xl px-1 sm:px-2 py-1 rounded focus:outline-none"
                  onClick={() => {
                    if (navigationStep === 'chapters') {
                      setNavigationStep('books');
                      setSelectedBook('');
                    } else if (navigationStep === 'verses') {
                      setNavigationStep('chapters');
                      setSelectedChapter('');
                    }
                  }}
                  aria-label="Go back"
                  style={{ background: 'transparent' }}
                >
                  ←
                </button>
              )}
              <span className="font-semibold text-lg sm:text-2xl" style={{ color: textColor, fontFamily: fontFamily }}>
                {navigationStep === 'books' && 'Select Book'}
                {navigationStep === 'chapters' && `${selectedBook}`}
                {navigationStep === 'verses' && `${selectedBook} ${selectedChapter}`}
              </span>
            </div>
            <button
              className="text-gray-500 hover:text-gray-800 text-xl sm:text-2xl px-2 sm:px-3 py-1 rounded focus:outline-none"
              onClick={() => {
                setShowBookNavigation(false);
                setNavigationStep('books');
                setSelectedBook('');
                setSelectedChapter('');
                // Restore previous screen
                if (prevScreen === 'fullscreen') {
                  setShowFull(true);
                }
                setPrevScreen(null);
              }}
              aria-label="Close navigation"
              style={{ background: 'transparent' }}
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 w-full overflow-auto" style={{ minHeight: 0 }}>
            <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
              <div className="rounded-xl shadow-lg p-4 sm:p-6 max-h-full overflow-auto" style={{ 
                backgroundColor: backgroundColor === '#000000' ? '#1a1a1a' : backgroundColor === '#f3f4f6' ? '#ffffff' : `${backgroundColor}dd`,
                border: `1px solid ${backgroundColor === '#000000' ? '#333' : '#e5e7eb'}`,
                color: textColor
              }}>
                {/* Books Grid */}
                {navigationStep === 'books' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 max-h-[70vh] overflow-y-auto">
                    {orderedBooks.map((bookName) => (
                      <button
                        key={bookName}
                        className="p-2 text-center focus:outline-none transition border"
                        style={{ 
                          color: textColor, 
                          fontWeight: 500, 
                          fontSize: 14, 
                          background: 'transparent',
                          borderColor: backgroundColor === '#000000' ? '#444' : '#e5e7eb',
                          fontFamily: fontFamily,
                          minHeight: '48px'
                        }}
                        onMouseEnter={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onFocus={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onClick={() => {
                          setSelectedBook(bookName);
                          setNavigationStep('chapters');
                        }}
                      >
                        {bookName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chapters Grid */}
                {navigationStep === 'chapters' && selectedBook && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-[70vh] overflow-y-auto">
                    {navigationChapters.map((chapterNum) => (
                      <button
                        key={chapterNum}
                        className="p-2 text-center focus:outline-none rounded transition border"
                        style={{ 
                          color: textColor, 
                          fontWeight: 500, 
                          fontSize: 14, 
                          background: 'transparent',
                          borderColor: backgroundColor === '#000000' ? '#444' : '#e5e7eb',
                          fontFamily: fontFamily
                        }}
                        onMouseEnter={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onFocus={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onClick={() => {
                          setSelectedChapter(chapterNum);
                          setNavigationStep('verses');
                        }}
                      >
                        {chapterNum}
                      </button>
                    ))}
                  </div>
                )}

                {/* Verses Grid */}
                {navigationStep === 'verses' && selectedBook && selectedChapter && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-[70vh] overflow-y-auto">
                    {navigationVerses.map((verseNum) => (
                      <button
                        key={verseNum}
                        className="p-2 text-center focus:outline-none rounded transition border"
                        style={{ 
                          color: textColor, 
                          fontWeight: 500, 
                          fontSize: 14, 
                          background: 'transparent',
                          borderColor: backgroundColor === '#000000' ? '#444' : '#e5e7eb',
                          fontFamily: fontFamily
                        }}
                        onMouseEnter={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onFocus={(e) => {
                          // Background hover logic
                          if (backgroundColor === '#f3f4f6') {
                            e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                          } else {
                            e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333' : '#f3f4f6';
                          }
                          // Text hover logic - white text stays white
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = textColor; // restore original text color
                        }}
                        onClick={() => {
                          setBook(selectedBook);
                          setChapter(selectedChapter);
                          setVerse(verseNum);
                          
                          // Add to recent verses
                          const ref = `${selectedBook} ${selectedChapter}:${verseNum}`;
                          setRecentVerses(prev => [ref, ...prev.filter(v => v !== ref)].slice(0, 20));
                          
                          // Close navigation and show verse
                          setShowBookNavigation(false);
                          setNavigationStep('books');
                          setSelectedBook('');
                          setSelectedChapter('');
                          setShowFull(true);
                          setPrevScreen(null);
                        }}
                      >
                        {verseNum}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer - not affected by font size, minimal distance from bottom/right */}
          {showCredit && (
            <footer className="fixed bottom-1 right-1 z-50">
              <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 10}}>
                Made with <span className="text-red-500">❤️</span> by Dylan
              </p>
            </footer>
          )}
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
                  <div className="w-6 h-6 bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg shadow-lg relative flex items-center justify-center">
                    {/* Light rays */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                      <div className="flex space-x-0.5">
                        <div className="w-0.5 h-1.5 bg-amber-300 rounded-full transform -rotate-12"></div>
                        <div className="w-0.5 h-2 bg-amber-300 rounded-full"></div>
                        <div className="w-0.5 h-1.5 bg-amber-300 rounded-full transform rotate-12"></div>
                      </div>
                    </div>
                    {/* Cross */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-0.5 h-4 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 rounded-sm"></div>
                        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2.5 h-0.5 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              {/* Centered Verse Title (centered with respect to the icons) */}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-center h-full pointer-events-none" style={{zIndex: 51}}>
                <div
                  className="font-bold text-center opacity-90 px-4 text-lg sm:text-4xl"
                  style={{
                    maxWidth: '80vw',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: 1.1,
                    fontFamily: fontFamily,
                  }}
                >
                  {book} {chapter}:{verse}
                </div>
              </div>
              {/* Settings and Clock - top right, match main menu */}
              <div className="flex flex-row items-center gap-2 ml-auto pr-0" style={{ pointerEvents: 'auto' }}>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      style={{ color: textColor }} 
                      className="hover:bg-transparent"
                      onMouseEnter={(e) => {
                        // Background hover logic
                        if (backgroundColor === '#f3f4f6') {
                          e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                        } else {
                          e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333333' : '#f3f4f6';
                        }
                        // Text hover logic - white text stays white
                        if (textColor !== '#ffffff') {
                          e.currentTarget.style.color = '#374151'; // gray-700 for other colors
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = textColor; // restore original text color
                      }}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle style={{ fontFamily: fontFamily }}>Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Text Color</Label>
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
                              <span style={{ fontFamily: fontFamily }}>{color.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Background Color</Label>
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
                              <span style={{ fontFamily: fontFamily }}>{bg.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Font Size: {fontSize[0]}px</Label>
                        <Slider value={fontSize} onValueChange={setFontSize} max={100} min={12} step={1} className="mt-2" />
                      </div>

                      <div>
                        <Label className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Font Family</Label>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger className="mt-2" style={{ fontFamily: fontFamily }}>
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            {fontOptions.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox id="credit-fullscreen" checked={showCredit} onCheckedChange={(checked) => setShowCredit(checked === true)} />
                        <Label htmlFor="credit-fullscreen" className="text-sm font-medium" style={{ fontFamily: fontFamily }}>Credit</Label>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="icon"
                  style={{ color: textColor }}
                  className="hover:bg-transparent"
                  onMouseEnter={(e) => {
                    // Background hover logic
                    if (backgroundColor === '#f3f4f6') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb'; // gray for white background
                    } else {
                      e.currentTarget.style.backgroundColor = backgroundColor === '#000000' ? '#333333' : '#f3f4f6';
                    }
                    // Text hover logic - white text stays white
                    if (textColor !== '#ffffff') {
                      e.currentTarget.style.color = '#374151'; // gray-700 for other colors
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = textColor; // restore original text color
                  }}
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
            <div className="flex-1 min-h-0 w-full flex items-center justify-center px-4 sm:px-10" style={{
              paddingTop: '0px',
              paddingBottom: '30px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}>
              <AutoSizedVerse
                text={verseText}
                fontSize={fontSize[0]}
                color={textColor}
                fontFamily={fontFamily}
              />
            </div>
            {/* Footer - not affected by font size, same margin as top bar */}
            {/* Footer - not affected by font size, minimal distance from bottom/right */}
            {showCredit && (
              <footer className="fixed bottom-1 right-1 z-50">
                <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 10 }}>
                  Made with <span className="text-red-500">❤️</span> by Dylan
                </p>
              </footer>
            )}

            {/* Left Arrow - only show if not at first verse of chapter */}
            {verses.indexOf(verse) > 0 && (
              <button
                className="absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-transparent hover:bg-black/10 focus:outline-none sm:ml-1.5"
                style={{ color: textColor, border: "none", borderRadius: '50%' }}
                onClick={() => {
                  // Move to previous verse
                  if (!bibleData || !book || !chapter || !verse) return;
                  let vIdx = verses.indexOf(verse);
                  let cIdx = chapters.indexOf(chapter);
                  let bIdx = orderedBooks.indexOf(book);
                  if (vIdx > 0) {
                    setVerse(verses[vIdx - 1]);
                  } else if (cIdx > 0) {
                    const prevChapter = chapters[cIdx - 1];
                    const prevVerses = bibleData[book][prevChapter] ? Object.keys(bibleData[book][prevChapter]) : [];
                    setChapter(prevChapter);
                    setVerse(prevVerses[prevVerses.length - 1]);
                  } else if (bIdx > 0) {
                    const prevBook = orderedBooks[bIdx - 1];
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
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-7 sm:h-7">
                  <polyline points="18,7 10,14 18,21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {/* Right Arrow - only show if not at last verse of chapter */}
            {verses.indexOf(verse) < verses.length - 1 && (
              <button
                className="absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-transparent hover:bg-black/10 focus:outline-none sm:mr-1.5"
                style={{ color: textColor, border: "none", borderRadius: '50%' }}
                onClick={() => {
                  // Move to next verse
                  if (!bibleData || !book || !chapter || !verse) return;
                  let vIdx = verses.indexOf(verse);
                  let cIdx = chapters.indexOf(chapter);
                  let bIdx = orderedBooks.indexOf(book);
                  if (vIdx < verses.length - 1) {
                    setVerse(verses[vIdx + 1]);
                  } else if (cIdx < chapters.length - 1) {
                    const nextChapter = chapters[cIdx + 1];
                    const nextVerses = bibleData[book][nextChapter] ? Object.keys(bibleData[book][nextChapter]) : [];
                    setChapter(nextChapter);
                    setVerse(nextVerses[0]);
                  } else if (bIdx < orderedBooks.length - 1) {
                    const nextBook = orderedBooks[bIdx + 1];
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
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-7 sm:h-7">
                  <polyline points="10,7 18,14 10,21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer (main view) */}
      {/* Footer (main view) - minimal distance from bottom/right */}
      {showCredit && (
        <footer className="fixed bottom-1 right-1 z-40">
          <p className="text-xs text-gray-500 opacity-80" style={{ fontSize: 10 }}>
            Made with <span className="text-red-500">❤️</span> by Dylan
          </p>
        </footer>
      )}
    </div>
  );
}

