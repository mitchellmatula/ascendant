-- CreateTable
CREATE TABLE "GymInvite" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "GymRole" NOT NULL DEFAULT 'COACH',
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymInviteUsage" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymInviteUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymInvite_token_key" ON "GymInvite"("token");

-- CreateIndex
CREATE INDEX "GymInvite_gymId_idx" ON "GymInvite"("gymId");

-- CreateIndex
CREATE INDEX "GymInvite_token_idx" ON "GymInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GymInviteUsage_inviteId_userId_key" ON "GymInviteUsage"("inviteId", "userId");

-- AddForeignKey
ALTER TABLE "GymInvite" ADD CONSTRAINT "GymInvite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvite" ADD CONSTRAINT "GymInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInviteUsage" ADD CONSTRAINT "GymInviteUsage_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "GymInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInviteUsage" ADD CONSTRAINT "GymInviteUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
