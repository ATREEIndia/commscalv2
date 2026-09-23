import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGBot/1.0)' },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('meta[name="og:title"]').attr('content') ??
      $('title').text() ??
      null;

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null, error: 'Failed to fetch' }, { status: 500 });
  }
}