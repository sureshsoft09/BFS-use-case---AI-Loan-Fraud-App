
import { Amplify } from "aws-amplify";

Amplify.configure({

    Auth: {
        Cognito: {
            region: "us-west-2",
            userPoolId: "us-west-2_GkxBd9NKT",
            userPoolClientId: "4akjhv1gsodlk7qm4l1i5gompb", // 👈 note: in v6 it's `userPoolClientId`
            loginWith: {
                username: true,    // allow username sign-in
                email: true,      // set true if you enabled email alias
                phone: false,
            },
            authenticationFlowType: "USER_SRP_AUTH",
        },
    },
});

