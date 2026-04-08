-- AlterTable
ALTER TABLE "ChannelMessage" ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "StudyGroup" ADD COLUMN     "chatGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudyGroup_chatGroupId_key" ON "StudyGroup"("chatGroupId");

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChannelMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroup" ADD CONSTRAINT "StudyGroup_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "ChatGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
