import getUsers from "../prisma/tablesData.js";
let users;

const rolesPermissions = {
    user: ['see_item'],
    admin: ['see_item', 'post_item', 'comment', 'chat', 'buy', 'give_perm', 'remove_user', 'warn', 'blacklist'],
    seller: ['see_item','post_item', 'comment', 'chat'],
    buyer: ['see_item', 'comment', 'chat', 'buy'],
    deliverer: ['see_item']
};

async function fillUsersValue() {
    try {
        const result = await getUsers(); 
        users = result.users;// Now 'users' contains the fetched object's users array
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

function hasPermission(userId, action) {
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return false; // User not found
    }

    const permissions = rolesPermissions[user.role];
    
    return permissions && permissions.includes(action);
}

function authPage(permissions){
    return function (req,res,next){
        const userRole = req.body.role;
        if (permissions.includes(userRole)){
            next()
        }
        else{
            return res.status(401).json("No permission");
        }
    }
}

async function main(){
    await fillUsersValue();
    console.log(hasPermission(7, 'see_item'));
}

main();
