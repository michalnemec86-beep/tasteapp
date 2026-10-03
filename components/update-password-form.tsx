"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordSaved && password.length < 8) {
      setError("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }

    if (!passwordSaved && password !== passwordAgain) {
      setError("Zadaná hesla se neshodují.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      if (!passwordSaved) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPasswordSaved(true);
        setPassword("");
        setPasswordAgain("");
      }

      const { data: completion, error: completionError } = await supabase.functions.invoke(
        "complete-initial-password",
        { body: {} },
      );
      if (completionError || completion?.ok !== true) {
        throw new Error("Heslo je uložené, ale dokončení se nepodařilo. Stiskni Zkusit dokončit znovu.");
      }

      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session || refreshed.user?.app_metadata?.must_change_password === true) {
        throw new Error("Heslo je uložené, ale obnovení přihlášení se nepodařilo. Stiskni Zkusit dokončit znovu.");
      }
      window.location.replace("/");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Heslo se nepodařilo změnit."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nastavit nové heslo</CardTitle>
          <CardDescription>
            Zadej nové heslo k účtu Pivník.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nové heslo</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Alespoň 8 znaků"
                  required={!passwordSaved}
                  disabled={isLoading || passwordSaved}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password-again">Nové heslo znovu</Label>
                <Input
                  id="password-again"
                  type="password"
                  placeholder="Zopakuj nové heslo"
                  required={!passwordSaved}
                  disabled={isLoading || passwordSaved}
                  minLength={8}
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Ukládám…" : passwordSaved ? "Zkusit dokončit znovu" : "Uložit nové heslo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
