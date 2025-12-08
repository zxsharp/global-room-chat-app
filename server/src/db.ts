import { prisma } from "./lib/prisma.js";

async function storeMessage(content: string, username: string){
    try{
        await prisma.message.create({
            data: {
                content,
                createdBy: username
            }
        })
    }
    catch(err){
        console.log(err);
        return false;
    }

    return true;
}


async function getRecentMessages(limit = 20) {
    const messages = await prisma.message.findMany({
        orderBy: { id: "desc" },
        take: limit,
    })

    return messages.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        username: msg.createdBy,
        createdAt: msg.createdAt
    }));
}

async function getMessagesByPage(cursor?: { id: number }, limit = 20) {
    const messages = await prisma.message.findMany({
        orderBy: { id: "desc" },
        take: limit,
        ...(cursor ? { where: { id: { lt: cursor.id } } } : {}),
    })

    return messages.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        username: msg.createdBy,
        createdAt: msg.createdAt
    }));
}

export {storeMessage, getRecentMessages, getMessagesByPage}