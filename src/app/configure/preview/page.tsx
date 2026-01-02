import { db } from "@/db";
import { notFound } from "next/navigation";
import DesignPreview from "./DesignPreview";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

const Page = async ({ searchParams }: PageProps) => {
  const { id } = searchParams;

  if (!id || typeof id !== "string") {
    return notFound();
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    return notFound();
  }

  const configuration = await db.configuration.findUnique({
    where: { id },
  });

  if (!configuration) {
    return notFound();
  }

  if (configuration.userId && configuration.userId !== user.id) {
    return notFound();
  }

  return <DesignPreview configuration={configuration} />;
};

export default Page;
