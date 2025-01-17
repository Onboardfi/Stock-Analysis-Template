"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TickerTape } from '@/components/tradingview/ticker-tape';
import Message from '@/components/message';
import { Profile } from '@/types/profile';
import { useRouter, useSearchParams } from 'next/navigation';  // Add useSearchParams
import {
  Card,
  Title,
  Text,
  Badge,
  Flex,
  Button,
} from '@tremor/react';
import Link from 'next/link';

interface CronResult {
  id: number;
  session: string;
  result?: string;
  error?: string;
  created_at: string;
}

interface Step {
  output: string;
  linkType?: string;
}

export default function CronDetails() {
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();  // Use useSearchParams to access query params
  const id = searchParams?.get('id');  // Safely get the 'id' query parameter

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase configuration is missing');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    async function fetchResult() {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('cron_results')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setResult(data);
      } catch (err) {
        console.error('Error fetching result:', err);
        setError('Failed to fetch result. Please try again later.');
      }
    }

    fetchResult();
  }, [id]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [result]);

  if (error) {
    return (
      <Card className="mt-4">
        <Text className="text-red-500">{error}</Text>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="mt-4">
        <Text>Loading...</Text>
      </Card>
    );
  }

  let parsedResult: { data?: { steps?: Step[] } } | null = null;
  try {
    parsedResult = result.result ? JSON.parse(result.result) : null;
  } catch (parseError) {
    console.error('Error parsing result JSON:', parseError);
    parsedResult = null;
  }

  return (
    <div className="flex h-screen flex-col">
      <TickerTape />
      <div className="flex-grow overflow-auto p-4">
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <Title>Cron Job Result Details</Title>
          <Link href="/cron-table" passHref>
            <Button size="xs" variant="secondary">
              Back to Table
            </Button>
          </Link>
        </Flex>
        
        <Card className="mb-4">
          <Flex justifyContent="between" alignItems="center">
            <Title>Job ID: {result.id}</Title>
            <Badge color={result.result ? "green" : "red"}>
              {result.result ? "Success" : "Error"}
            </Badge>
          </Flex>
          <Text className="mt-2">Session: {result.session}</Text>
          <Text>Created At: {new Date(result.created_at).toLocaleString()}</Text>
          <Message
            type="ai"
            message={
              parsedResult?.data?.steps 
                ? parsedResult.data.steps.map(step => step.output).join("\n\n")
                : result.error || 'No result or error recorded'
            }
            isSuccess={!!result.result}
            profile={{} as Profile}
            steps={parsedResult?.data?.steps?.reduce<Record<string, { content: string; linkType?: string }>>((acc, step, index) => {
              acc[`Step ${index + 1}`] = { content: step.output, linkType: step.linkType };
              return acc;
            }, {})}
          />
        </Card>
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
