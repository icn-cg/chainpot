'use client';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

export default function Home() {
  const [addr, setAddr] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Chainpool</h1>
        <p className="text-muted-foreground">Decentralized money pools with smart billing and referrals</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create a Pool</CardTitle>
            <CardDescription>
              Start a new money pool with custom entry fees and duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create">
              <Button className="w-full">Create New Pool</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Existing Pool</CardTitle>
            <CardDescription>
              Enter a pool address to view details and participate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="0xPoolAddress..."
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                className="flex-1"
              />
              <Link href={addr ? `/pot/${addr}` : '#'}>
                <Button variant="outline" disabled={!addr}>
                  Open
                </Button>
              </Link>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Demo Pool:</p>
              <Link href="/pot/0xC9e2125c0F792781A80dcE2c396Ce277F030A0a3">
                <Badge variant="secondary" className="font-mono text-xs">
                  0xC9e2125c0F792781A80dcE2c396Ce277F030A0a3
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
