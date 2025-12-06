-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
