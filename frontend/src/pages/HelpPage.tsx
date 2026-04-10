import React, { useState } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ExpandMore, HelpOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  getHelpTopics,
  getHelpTopicBySlug,
  HelpTopic,
  HelpTopicDetail,
} from '../services/helpService';
import PageHeader from '../components/PageHeader';

// --- Simple Markdown Renderer ---
// NOTE: Content is from our own trusted API (admin-authored help topics).
// All text is HTML-escaped via escapeAndInline() before any formatting is applied,
// preventing XSS even if content were somehow tampered with.

/**
 * Converts a simple subset of markdown to HTML:
 * - ## headings -> <h6>
 * - ### headings -> <h6> (smaller)
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - `code` -> <code>
 * - - list items -> <ul><li>
 * - numbered lists -> <ol><li>
 * - empty lines -> paragraph breaks
 * - [text](url) -> <a>
 */
const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close list if not a list item
    if (inList && !line.match(/^\s*[-*]\s/)) {
      htmlParts.push('</ul>');
      inList = false;
    }
    if (inOrderedList && !line.match(/^\s*\d+\.\s/)) {
      htmlParts.push('</ol>');
      inOrderedList = false;
    }

    // Headings
    if (line.startsWith('### ')) {
      htmlParts.push(
        `<h6 style="margin: 16px 0 8px; font-size: 0.95rem; font-weight: 600;">${escapeAndInline(line.slice(4))}</h6>`
      );
      continue;
    }
    if (line.startsWith('## ')) {
      htmlParts.push(
        `<h6 style="margin: 20px 0 10px; font-size: 1.05rem; font-weight: 700;">${escapeAndInline(line.slice(3))}</h6>`
      );
      continue;
    }
    if (line.startsWith('# ')) {
      htmlParts.push(
        `<h5 style="margin: 24px 0 12px; font-size: 1.15rem; font-weight: 700;">${escapeAndInline(line.slice(2))}</h5>`
      );
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (ulMatch) {
      if (!inList) {
        htmlParts.push('<ul style="margin: 8px 0; padding-left: 24px;">');
        inList = true;
      }
      htmlParts.push(`<li style="margin-bottom: 4px;">${escapeAndInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inOrderedList) {
        htmlParts.push('<ol style="margin: 8px 0; padding-left: 24px;">');
        inOrderedList = true;
      }
      htmlParts.push(`<li style="margin-bottom: 4px;">${escapeAndInline(olMatch[1])}</li>`);
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      htmlParts.push('<br />');
      continue;
    }

    // Regular text
    htmlParts.push(`<p style="margin: 4px 0; line-height: 1.7;">${escapeAndInline(line)}</p>`);
  }

  // Close open lists
  if (inList) htmlParts.push('</ul>');
  if (inOrderedList) htmlParts.push('</ol>');

  return htmlParts.join('\n');
};

/**
 * Escape HTML entities first, then apply inline formatting: bold, italic, code, links.
 * The escaping step (& < >) runs BEFORE any tag insertion, preventing XSS.
 */
const escapeAndInline = (text: string): string => {
  // Step 1: Escape HTML entities to prevent injection
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Step 2: Apply markdown inline formatting on the escaped text

  // Links: [text](url) — only allow http(s) URLs
  safe = safe.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>'
  );

  // Bold: **text**
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code: `code`
  safe = safe.replace(
    /`(.+?)`/g,
    '<code style="padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">$1</code>'
  );

  return safe;
};

// --- Topic Content Component (lazy-loaded per topic) ---

const TopicContent: React.FC<{ slug: string; expanded: boolean }> = ({
  slug,
  expanded,
}) => {
  const { data, isLoading, error } = useQuery<HelpTopicDetail>(
    ['help-topic', slug],
    () => getHelpTopicBySlug(slug),
    {
      enabled: expanded, // Only fetch when accordion is open
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  if (!expanded) return null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить содержимое. Попробуйте снова.
      </Alert>
    );
  }

  if (!data?.content) {
    return (
      <Typography variant="body2" color="text.secondary">
        Содержимое пока не добавлено.
      </Typography>
    );
  }

  // Content is sanitized via escapeAndInline() which HTML-escapes all text
  // before applying safe markdown formatting tags
  return (
    <Box
      sx={{
        '& a': {
          color: 'primary.main',
        },
        '& code': {
          bgcolor: 'action.hover',
        },
      }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content) }}
    />
  );
};

// --- Main Component ---

const HelpPage: React.FC = () => {
  const [expandedSlug, setExpandedSlug] = useState<string | false>(false);

  const {
    data: topics,
    isLoading,
    error,
  } = useQuery<HelpTopic[]>(['help-topics'], getHelpTopics);

  const handleChange =
    (slug: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedSlug(isExpanded ? slug : false);
    };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
        <Alert severity="error">
          Не удалось загрузить справочные материалы. Попробуйте обновить страницу.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, mt: 2, maxWidth: 800, mx: 'auto' }}>
      <PageHeader
        title="Помощь"
        subtitle="Справочные материалы и ответы на частые вопросы"
      />

      {!topics || topics.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <HelpOutline sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary">
            Справочные материалы пока не добавлены
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {topics.map((topic) => (
            <Accordion
              key={topic.slug}
              expanded={expandedSlug === topic.slug}
              onChange={handleChange(topic.slug)}
              elevation={0}
              disableGutters
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                overflow: 'hidden',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  borderColor: 'primary.main',
                  boxShadow: (theme) =>
                    `0 0 0 1px ${theme.palette.primary.main}20`,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  px: 3,
                  py: 0.5,
                  '& .MuiAccordionSummary-content': {
                    my: 1.5,
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {topic.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                <TopicContent
                  slug={topic.slug}
                  expanded={expandedSlug === topic.slug}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default HelpPage;
