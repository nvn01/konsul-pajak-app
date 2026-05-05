-- CreateTable
CREATE TABLE "Peraturan" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "topik" TEXT NOT NULL,
    "tahun" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Peraturan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Peraturan_nomor_key" ON "Peraturan"("nomor");

-- CreateIndex
CREATE INDEX "Peraturan_jenis_idx" ON "Peraturan"("jenis");

-- CreateIndex
CREATE INDEX "Peraturan_topik_idx" ON "Peraturan"("topik");

-- CreateIndex
CREATE INDEX "Peraturan_status_idx" ON "Peraturan"("status");
