import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NotAuthorizedPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Yetkisiz erişim</CardTitle>
          <CardDescription>
            Bu sayfayı görüntülemek için gerekli role sahip değilsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Menüden erişebildiğiniz modülleri kullanabilir veya yöneticinizden yetki
          isteyebilirsiniz.
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link to="/dashboard">Panele dön</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
