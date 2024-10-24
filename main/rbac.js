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

export function hasPermission(userId, action) {
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        console.log('user not found')
        return false; 
    }

    const permissions = rolesPermissions[user.role];
    
    return permissions && permissions.includes(action);
}

export default function authorize(actions){
    return function (req,res,next){
        const userRole = req.user.role;
        const permissions = rolesPermissions[userRole];
        //checks if the role has all the actions required
        if (actions.every(action => permissions.includes(action))){
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

// main();
