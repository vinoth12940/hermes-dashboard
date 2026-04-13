"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import { BookOpen, Search, ChevronDown, ChevronRight, FolderOpen, FileText, Code, AlertTriangle, RefreshCw, ChevronsUpDown } from 'lucide-react';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/50 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-6 text-center space-y-3">
      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
      <p className="text-sm text-zinc-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors inline-flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

interface Skill {
  name: string;
  path: string;
  hasSkillMd: boolean;
}

interface SkillCategory {
  category: string;
  skills: Skill[];
}

export default function SkillsPage() {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.skills || []);
        setExpandedCategories(new Set((data.skills || []).map((c: SkillCategory) => c.category)));
      } else {
        setError('Failed to load skills');
      }
    } catch {
      setError('Failed to load skills');
    }
    setLoading(false);
  };

  const fetchSkillContent = async (skillPath: string) => {
    if (expandedSkill === skillPath) {
      setExpandedSkill(null);
      setSkillContent('');
      return;
    }
    setLoadingContent(true);
    setExpandedSkill(skillPath);
    try {
      const res = await fetch(`/api/skills?path=${encodeURIComponent(skillPath + '/SKILL.md')}`);
      if (res.ok) {
        const data = await res.json();
        setSkillContent(data.content || '');
      }
    } catch (e) { console.error(e); }
    setLoadingContent(false);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = search
    ? categories.map(cat => ({
        ...cat,
        skills: cat.skills.filter(s => 
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          cat.category.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.skills.length > 0)
    : categories;

  const totalSkills = categories.reduce((sum, cat) => sum + cat.skills.length, 0);

  const allExpanded = filtered.length > 0 && filtered.every(cat => expandedCategories.has(cat.category));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(filtered.map(cat => cat.category)));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Skills</h1>
          <p className="text-sm text-zinc-500 mt-1">{totalSkills} skills across {categories.length} categories</p>
        </div>
        {!loading && !error && filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors flex items-center gap-2"
          >
            <ChevronsUpDown className="w-4 h-4" />
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        )}
      </div>

      {!loading && !error && categories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">Total Skills</p>
            <p className="text-xl font-bold dark:text-zinc-100 text-zinc-900">{totalSkills}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">Categories</p>
            <p className="text-xl font-bold dark:text-zinc-100 text-zinc-900">{categories.length}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetchSkills} />
      ) : (
        <div className="space-y-3">
          {filtered.map((cat) => (
            <div key={cat.category} className="glass-card overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full flex items-center gap-3 p-4 dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors"
              >
                {expandedCategories.has(cat.category) ? 
                  <ChevronDown className="w-4 h-4 text-zinc-500" /> : 
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                }
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold dark:text-zinc-200 text-zinc-800 flex-1 text-left">{cat.category}</span>
                <Badge variant="default">{cat.skills.length}</Badge>
              </button>
              
              {expandedCategories.has(cat.category) && (
                <div className="border-t dark:border-zinc-800/30 border-zinc-200 divide-y dark:divide-zinc-800/30 divide-zinc-200">
                  {cat.skills.map((skill) => (
                    <div key={skill.path}>
                      <button
                        onClick={() => skill.hasSkillMd && fetchSkillContent(skill.path)}
                        disabled={!skill.hasSkillMd}
                        className="w-full flex items-center gap-3 px-4 pl-12 py-3 dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors text-left disabled:opacity-50"
                      >
                        {skill.hasSkillMd ? 
                          <FileText className="w-4 h-4 text-violet-400" /> : 
                          <Code className="w-4 h-4 text-zinc-600" />
                        }
                        <span className="text-sm dark:text-zinc-300 text-zinc-700 flex-1">{skill.name}</span>
                        {expandedSkill === skill.path && <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                        {skill.hasSkillMd && expandedSkill !== skill.path && <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                        {!skill.hasSkillMd && <Badge variant="default" size="sm">no SKILL.md</Badge>}
                      </button>
                      
                      {expandedSkill === skill.path && (
                        <div className="px-12 pb-4">
                          {loadingContent ? (
                            <p className="text-xs text-zinc-500">Loading...</p>
                          ) : (
                            <div className="dark:bg-zinc-900/80 bg-zinc-100 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                              <pre className="text-xs dark:text-zinc-400 text-zinc-500 whitespace-pre-wrap font-mono leading-relaxed">
                                {skillContent}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="glass-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">No skills found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
